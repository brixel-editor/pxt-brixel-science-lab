enum SciencePulseChannel {
    //% block="red"
    Red = 0,
    //% block="infrared"
    Infrared = 1
}
//% color=#BA5B86 weight=69 block="Body signals"
//% groups='["Heart rate sensor(MAX30102)","Fingerprint(AS608)"]'
namespace scienceBio {
    let pulseReady = false
    let pulseAt = -1000
    let pulsePollAt = -1000
    let pulseRed = -1
    let pulseIR = -1
    function pulseInit(): boolean {
        let id = scienceBus.register(0x57, 0xFF, 1)
        if (!id || id[0] != 0x15 || !scienceBus.write(0x57, [9, 0x40])) return false
        let start = control.millis()
        while (true) {
            let mode = scienceBus.register(0x57, 9, 1)
            if (!mode) return false
            if (!(mode[0] & 0x40)) break
            if (control.millis() - start >= 100) return false
            basic.pause(2)
        }
        // MAX30102 mode 0x03: red+IR, 100 SPS, 18-bit/411us, 4096nA, 6.4mA LEDs; no FIFO averaging/rollover.
        let settings = [0x02, 0, 0x03, 0, 0x04, 0, 0x05, 0, 0x06, 0, 0x08, 0x0F,
            0x0A, 0x27, 0x0C, 0x1F, 0x0D, 0x1F, 0x09, 0x03]
        for (let i = 0; i < settings.length; i += 2)
            if (!scienceBus.write(0x57, [settings[i], settings[i + 1]])) return false
        // Clear reset's latched PWR_RDY before checking for later brownouts.
        if (!scienceBus.register(0x57, 0, 2)) return false
        basic.pause(12)
        return true
    }
    function pulseFail(): void { pulseRed = -1; pulseIR = -1; pulseAt = -1000; pulseReady = false }
    /** MAX30102 I2C optical pulse waveform. Raw 18-bit counts, read every 20..100ms. Not heart rate or SpO2. Missing/stale data or FIFO overflow=-1. */
    // MakeCode hides headings when a category has only one group, so keep the model in the block label too.
    //% blockId=science_pulse_raw block="heart rate sensor(MAX30102) $channel pulse raw value" group="Heart rate sensor(MAX30102)"
    export function pulseRaw(channel: SciencePulseChannel): number {
        if (channel != SciencePulseChannel.Red && channel != SciencePulseChannel.Infrared) return -1
        scienceBus.acquire()
        if (control.millis() - pulsePollAt >= 10) {
            if (!pulseReady) pulseReady = pulseInit()
            if (pulseReady) {
                let pointers = scienceBus.register(0x57, 4, 3)
                let status = scienceBus.register(0x57, 0, 1)
                if (!pointers || !status || (status[0] & 1) || pointers[1] != 0) pulseFail()
                else {
                    let count = (pointers[0] - pointers[2] + 32) & 31
                    // Equal pointers + almost-full means all 32 entries, not an empty FIFO.
                    if (count == 0 && (status[0] & 0x80)) count = 32
                    while (count > 0 && pulseReady) {
                        let batch = Math.min(8, count)
                        let data = scienceBus.register(0x57, 7, batch * 6)
                        if (!data) { pulseFail(); break }
                        let offset = (batch - 1) * 6
                        pulseRed = ((data[offset] & 3) << 16) | (data[offset + 1] << 8) | data[offset + 2]
                        pulseIR = ((data[offset + 3] & 3) << 16) | (data[offset + 4] << 8) | data[offset + 5]
                        pulseAt = control.millis()
                        count -= batch
                    }
                }
            } else pulseFail()
            pulsePollAt = control.millis()
        }
        let result = control.millis() - pulseAt > 300 ? -1 : (channel == SciencePulseChannel.Red ? pulseRed : pulseIR)
        scienceBus.release()
        return result
    }
}
