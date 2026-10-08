enum ScienceFingerprintStep {
    //% block="1st enrollment"
    First = 0,
    //% block="2nd enrollment"
    Second = 1
}
namespace scienceBio {
    let fingerBusy = false
    let fingerSession = -1
    let fingerCapacity = 0
    let fingerFirstID = -1
    let fingerFirstAt = 0
    let fingerStatusValue = -1
    function fingerSelected(): boolean { return scienceUART.owner == 4 && scienceUART.session == fingerSession }
    function fingerLock(): void { while (fingerBusy) basic.pause(1); fingerBusy = true }
    function fingerTransportFail(): number[] {
        // ACK packets have no command ID: after a timeout a late ACK must never satisfy a new command.
        fingerSession = -1; fingerCapacity = 0; fingerFirstID = -1; fingerStatusValue = -1
        return null
    }
    // Only acknowledgement packets are accepted. No fingerprint image/template leaves the sensor.
    function fingerCommand(command: number[]): number[] {
        fingerStatusValue = -1
        if (!fingerSelected()) return null
        for (let i = 0; i < 4; i++) if (scienceNative.readSensorUART().length < 64) break
        let packet = [0xEF, 1, 255, 255, 255, 255, 1, 0, command.length + 2]
        let sum = 1 + command.length + 2
        for (let b of command) { packet.push(b); sum += b }
        packet.push((sum >> 8) & 255); packet.push(sum & 255)
        if (!scienceUART.write(4, pins.createBufferFromArray(packet), fingerSession)) return fingerTransportFail()
        let bytes: number[] = []
        let start = control.millis()
        while (fingerSelected() && control.millis() - start < 1000) {
            let data = scienceNative.readSensorUART()
            for (let i = 0; i < data.length; i++) bytes.push(data[i])
            while (bytes.length >= 9) {
                if (bytes[0] != 0xEF || bytes[1] != 1 || bytes[2] != 255 || bytes[3] != 255 ||
                    bytes[4] != 255 || bytes[5] != 255 || bytes[6] != 7) { bytes.shift(); continue }
                let length = bytes[7] * 256 + bytes[8]
                if (length < 3 || length > 64) { bytes.shift(); continue }
                if (bytes.length < length + 9) break
                let checksum = 0
                for (let i = 6; i < length + 7; i++) checksum += bytes[i]
                if ((checksum & 65535) != bytes[length + 7] * 256 + bytes[length + 8]) return fingerTransportFail()
                let reply = bytes.slice(9, length + 7)
                fingerStatusValue = reply[0]
                return reply
            }
            basic.pause(5)
        }
        return fingerTransportFail()
    }
    function fingerOK(command: number[]): boolean {
        let reply = fingerCommand(command)
        if (reply && reply.length != 1) { fingerTransportFail(); return false }
        return reply != null && reply[0] == 0
    }
    function fingerCapture(slot: number): boolean {
        return fingerOK([1]) && fingerOK([2, slot])
    }
    /** AS608 factory password 0/address FFFFFFFF, usually 57600 baud. Sensor TX to RX, RX to TX. Waits 1s for boot and reads capacity. Selects this UART sensor; USB/BLE remain available. */
    //% blockId=science_fingerprint_start block="start fingerprint sensor RX $rx TX $tx baud $baud" group="Fingerprint(AS608)"
    //% rx.defl=ScienceDigitalPin.P13 tx.defl=ScienceDigitalPin.P14 baud.defl=ScienceSensorBaud.Baud57600
    export function startFingerprint(rx: ScienceDigitalPin, tx: ScienceDigitalPin, baud: ScienceSensorBaud = ScienceSensorBaud.Baud57600): void {
        fingerLock()
        fingerCapacity = 0; fingerFirstID = -1; fingerStatusValue = -1
        if (scienceUART.start(4, rx, tx, baud)) {
            fingerSession = scienceUART.session
            basic.pause(1000)
            if (fingerOK([0x13, 0, 0, 0, 0])) {
                let parameters = fingerCommand([0x0F])
                if (parameters && parameters[0] == 0 && parameters.length == 17) {
                    fingerCapacity = parameters[5] * 256 + parameters[6]
                    if (fingerCapacity < 1 || fingerCapacity > 1000) { fingerCapacity = 0; fingerStatusValue = -1 }
                } else fingerStatusValue = -1
            }
        }
        fingerBusy = false
    }
    /** Run 1st enrollment, lift the finger, then run 2nd enrollment with the same finger and ID within 60 seconds. 2nd enrollment saves inside AS608 and replaces an existing template at that ID. Check fingerprint status afterward: 0=success. IDs start at 1 and must be below capacity. */
    //% blockId=science_fingerprint_enroll block="fingerprint ID $id $step" group="Fingerprint(AS608)"
    //% id.defl=1 id.min=1 id.max=999
    export function enrollFingerprint(step: ScienceFingerprintStep, id: number): void {
        fingerLock()
        if (!fingerSelected() || id < 1 || id >= fingerCapacity || id != Math.floor(id) || (step != 0 && step != 1)) {
            fingerFirstID = -1; fingerStatusValue = -1
        } else if (step == ScienceFingerprintStep.First) {
            fingerFirstID = -1
            if (fingerCapture(1)) { fingerFirstID = id; fingerFirstAt = control.millis() }
        } else if (fingerFirstID == id && control.millis() - fingerFirstAt <= 60000) {
            // Consume the first stage even when capture fails, so old character buffers cannot be reused.
            fingerFirstID = -1
            if (fingerCapture(2) && fingerOK([5])) fingerOK([6, 1, (id >> 8) & 255, id & 255])
        } else { fingerFirstID = -1; fingerStatusValue = -1 }
        fingerBusy = false
    }
    /** Capture and find a registered fingerprint. Returns its ID; no finger, no match, communication error or unselected sensor=-1. Inspect status for the reason. */
    //% blockId=science_fingerprint_find block="fingerprint matched ID" group="Fingerprint(AS608)"
    export function fingerprintID(): number {
        fingerLock()
        fingerFirstID = -1
        let result = -1
        if (!fingerSelected() || fingerCapacity == 0) fingerStatusValue = -1
        else if (fingerCapture(1)) {
            let reply = fingerCommand([4, 1, 0, 0, (fingerCapacity >> 8) & 255, fingerCapacity & 255])
            if (reply && reply[0] == 0) {
                if (reply.length == 5) {
                    let id = reply[1] * 256 + reply[2]
                    if (id < fingerCapacity) result = id
                    else fingerStatusValue = -1
                } else fingerStatusValue = -1
            }
        }
        fingerBusy = false
        return result
    }
    /** Last AS608 confirmation code: 0 success, 2 no finger, 9 no match, 10 enrollment mismatch. Other positive values are sensor errors; -1 means setup/transport/argument error. Run Start again after a transport error. */
    //% blockId=science_fingerprint_status block="fingerprint status code" group="Fingerprint(AS608)"
    export function fingerprintStatus(): number { return fingerSelected() ? fingerStatusValue : -1 }
}
