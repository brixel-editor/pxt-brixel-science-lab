namespace scienceUART {
    // One independent hardware UART. Starting a different sensor invalidates the old owner's values.
    export let owner = 0
    let configuring = false
    export function start(nextOwner: number, rx: number, tx: number): boolean {
        while (configuring) basic.pause(1)
        configuring = true
        owner = 0
        let ready = false
        if (rx != tx && scienceInternal.validDigital(rx) && scienceInternal.validDigital(tx)) {
            scienceInternal.prepare(rx); scienceInternal.prepare(tx)
            ready = scienceNative.startSensorUART(rx, tx)
        }
        if (ready) owner = nextOwner
        configuring = false
        return ready
    }
    export function write(expectedOwner: number, data: Buffer): boolean {
        while (configuring) basic.pause(1)
        if (owner != expectedOwner) return false
        configuring = true
        let result = scienceNative.writeSensorUART(data)
        configuring = false
        return result
    }
}
