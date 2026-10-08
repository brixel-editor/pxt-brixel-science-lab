// APDS9960 configuration/ratio method based on Shawn Hymel / SparkFun (public domain).
namespace scienceDetection {
    let apdsStarted = false
    let apdsReady = false
    let apdsAt = -10000
    let apdsProximityAt = -10000
    let apdsColorAt = -10000
    let apdsProximity = -1
    let apdsColors = [-1, -1, -1, -1]
    let apdsGesture = 0
    let apdsGestureAt = -10000
    let apdsSamples = 0
    let apdsFirstUD = 0
    let apdsFirstLR = 0
    let apdsLastUD = 0
    let apdsLastLR = 0
    let apdsGestureStart = 0
    function apdsInit(): boolean {
        let id = scienceBus.register(0x39, 0x92, 1)
        if (!id || (id[0] != 0xAB && id[0] != 0x9C)) return false
        // 4x gains; LED 100mA without boost. ALS 103ms. No interrupt pin needed.
        let settings = [0x80, 0, 0x81, 219, 0x83, 0xFF, 0x8E, 0x89, 0x9D, 0, 0x9E, 0,
            0x8D, 0x60, 0x8F, 0x09, 0x89, 0, 0x8B, 50, 0x8C, 0x11, 0x90, 1, 0x9F, 0,
            0xA0, 40, 0xA1, 30, 0xA2, 0x40, 0xA3, 0x41, 0xA4, 0, 0xA5, 0, 0xA7, 0, 0xA9, 0,
            0xA6, 0xC9, 0xAA, 0, 0xAB, 4, 0xAB, 0, 0x80, 0x4F]
        for (let i = 0; i < settings.length; i += 2)
            if (!scienceBus.write(0x39, [settings[i], settings[i + 1]])) return false
        apdsSamples = 0
        return true
    }
    function apdsFail(): void {
        apdsReady = false; apdsAt = -10000; apdsProximityAt = -10000; apdsColorAt = -10000
        apdsGesture = 0; apdsSamples = 0
    }
    function apdsSample(): void {
        scienceBus.acquire()
        if (!apdsReady) apdsReady = apdsInit()
        let ok = apdsReady
        if (ok) {
            let status = scienceBus.register(0x39, 0x93, 1)
            if (!status) ok = false
            else {
                if (status[0] & 1) {
                    let color = scienceBus.register(0x39, 0x94, 8)
                    if (!color) ok = false
                    else {
                        apdsColors = [scienceBus.u16(color, 2), scienceBus.u16(color, 4), scienceBus.u16(color, 6), scienceBus.u16(color, 0)]
                        apdsColorAt = control.millis()
                    }
                }
                if (status[0] & 2) {
                    let proximity = scienceBus.register(0x39, 0x9C, 1)
                    if (!proximity) ok = false
                    else { apdsProximity = proximity[0]; apdsProximityAt = control.millis() }
                }
            }
            let gesture = scienceBus.register(0x39, 0xAF, 1)
            let level = scienceBus.register(0x39, 0xAE, 1)
            if (!gesture || !level || level[0] > 32 || (gesture[0] & 2)) ok = false
            else {
                let remaining = level[0]
                while (remaining > 0 && ok) {
                    let batch = Math.min(16, remaining)
                    let fifo = scienceBus.register(0x39, 0xFC, batch * 4)
                    if (!fifo) { ok = false; break }
                    for (let i = 0; i < fifo.length; i += 4) {
                        let u = fifo[i], d = fifo[i + 1], l = fifo[i + 2], r = fifo[i + 3]
                        if (u <= 10 || d <= 10 || l <= 10 || r <= 10) continue
                        apdsLastUD = 100 * (u - d) / (u + d)
                        apdsLastLR = 100 * (l - r) / (l + r)
                        if (apdsSamples == 0) {
                            apdsFirstUD = apdsLastUD; apdsFirstLR = apdsLastLR; apdsGestureStart = control.millis()
                        }
                        apdsSamples++
                    }
                    remaining -= batch
                }
                if (!(gesture[0] & 1)) {
                    if (apdsSamples >= 5) {
                        let ud = apdsLastUD - apdsFirstUD, lr = apdsLastLR - apdsFirstLR
                        if (Math.abs(ud) >= 50 || Math.abs(lr) >= 50) {
                            apdsGesture = Math.abs(ud) >= Math.abs(lr) ? (ud < 0 ? 1 : 2) : (lr < 0 ? 3 : 4)
                            apdsGestureAt = control.millis()
                        }
                    }
                    apdsSamples = 0
                } else if (apdsSamples && control.millis() - apdsGestureStart > 1000) ok = false
            }
        }
        if (ok) apdsAt = control.millis()
        else apdsFail()
        scienceBus.release()
    }
    function apdsStart(): void {
        if (apdsStarted) return
        apdsStarted = true
        control.inBackground(function () { while (true) { apdsSample(); basic.pause(50) } })
    }
    /** APDS9960 proximity raw 0..255, not centimetres. Uses background sampling; first sample, disconnected or stale=-1. */
    //% blockId=science_apds_proximity block="gesture sensor proximity raw value" group="Gesture sensor"
    export function gestureProximity(): number {
        apdsStart()
        return !apdsReady || control.millis() - apdsProximityAt > 500 ? -1 : apdsProximity
    }
    /** APDS9960 color raw 0..65535. Uses the same background sampler as gesture/proximity. First sample, disconnected or stale=-1. */
    //% blockId=science_apds_color block="gesture sensor $channel raw value" group="Gesture sensor"
    export function gestureColor(channel: ScienceColorChannel): number {
        apdsStart()
        if (channel < 0 || channel > 3 || channel != Math.floor(channel) || !apdsReady || control.millis() - apdsColorAt > 500) return -1
        return apdsColors[channel]
    }
    /** APDS9960 completed gesture: 0 none, 1 up, 2 down, 3 left, 4 right. Consumed once; expires after 1 second. Sensor orientation matters. Error=-1. */
    //% blockId=science_apds_gesture block="gesture sensor direction number" group="Gesture sensor"
    export function gestureDirection(): number {
        apdsStart()
        if (!apdsReady || control.millis() - apdsAt > 500) return -1
        let result = control.millis() - apdsGestureAt <= 1000 ? apdsGesture : 0
        apdsGesture = 0
        return result
    }
}
