enum ScienceSensorBaud {
    //% block="9600"
    Baud9600 = 9600,
    //% block="19200"
    Baud19200 = 19200,
    //% block="38400"
    Baud38400 = 38400,
    //% block="57600"
    Baud57600 = 57600,
    //% block="115200"
    Baud115200 = 115200
}
namespace scienceUART {
    // One independent hardware UART. Starting a different sensor invalidates the old owner's values.
    export let owner = 0
    export let session = 0
    let configuring = false
    export function start(nextOwner: number, rx: number, tx: number, baud: number = 9600): boolean {
        while (configuring) basic.pause(1)
        configuring = true
        owner = 0
        session++
        let ready = false
        if ((baud == 9600 || baud == 19200 || baud == 38400 || baud == 57600 || baud == 115200) &&
            rx != tx && scienceInternal.validDigital(rx) && scienceInternal.validDigital(tx)) {
            scienceInternal.prepare(rx); scienceInternal.prepare(tx)
            ready = scienceNative.startSensorUART(rx, tx, baud)
        }
        if (ready) owner = nextOwner
        configuring = false
        return ready
    }
    export function write(expectedOwner: number, data: Buffer, expectedSession: number = 0): boolean {
        while (configuring) basic.pause(1)
        if (owner != expectedOwner || (expectedSession > 0 && session != expectedSession)) return false
        configuring = true
        let result = scienceNative.writeSensorUART(data)
        configuring = false
        return result
    }
}
