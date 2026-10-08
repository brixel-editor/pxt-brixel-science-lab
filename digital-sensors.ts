enum ScienceDHTModel {
    //% block="DHT11"
    DHT11 = 11,
    //% block="DHT22"
    DHT22 = 22
}
namespace scienceWeather {
    class DHTCache {
        pin: number
        model: number
        at: number
        temperature: number
        humidity: number
        constructor(pin: number, model: number) {
            this.pin = pin; this.model = model; this.at = -2000
            this.temperature = -127; this.humidity = -1
        }
    }
    let dhtCache: DHTCache[] = []
    let dhtBusy = false
    function waitLevel(pin: DigitalPin, level: number): boolean {
        let start = control.micros()
        let guard = 0
        while (pins.digitalReadPin(pin) == level) {
            if (++guard > 20000 || ((control.micros() - start) >>> 0) > 300) return false
        }
        return true
    }
    /** d-001/002: connect G/V/S to a 3.3V port. Each sensor is sampled at most once per 2 seconds. Temperature failure=-127, humidity=-1. */
    //% blockId=science_dht block="$model pin $pin $value" group="DHT" pin.defl=ScienceDigitalPin.P8
    export function dht(model: ScienceDHTModel, pin: ScienceDigitalPin, value: ScienceClimateValue): number {
        let failure = value == ScienceClimateValue.Temperature ? -127 : -1
        if (!scienceInternal.validDigital(pin) || (model != ScienceDHTModel.DHT11 && model != ScienceDHTModel.DHT22)) return failure
        while (dhtBusy) basic.pause(1)
        dhtBusy = true
        let cache: DHTCache = null
        for (let i = 0; i < dhtCache.length; i++) if (dhtCache[i].pin == pin) cache = dhtCache[i]
        if (!cache) { cache = new DHTCache(pin, model); dhtCache.push(cache) }
        if (cache.model != model) { cache.model = model; cache.at = -2000; cache.temperature = -127; cache.humidity = -1 }
        if (control.millis() - cache.at >= 2000) {
            cache.temperature = -127; cache.humidity = -1
            scienceInternal.prepare(pin)
            let p = <DigitalPin><number>pin
            pins.setPull(p, PinPullMode.PullUp)
            pins.digitalReadPin(p)
            basic.pause(250)
            pins.digitalWritePin(p, 0)
            basic.pause(20)
            pins.digitalReadPin(p)
            // Consume response HIGH->LOW->HIGH->LOW. No global interrupt masking (BLE remains enabled).
            let ok = waitLevel(p, 1) && waitLevel(p, 0) && waitLevel(p, 1)
            let bytes = [0, 0, 0, 0, 0]
            for (let bit = 0; ok && bit < 40; bit++) {
                let low = control.micros()
                if (!waitLevel(p, 0)) { ok = false; break }
                let high = control.micros()
                if (!waitLevel(p, 1)) { ok = false; break }
                let end = control.micros()
                let index = Math.idiv(bit, 8)
                bytes[index] = bytes[index] << 1 | (((end - high) >>> 0) > ((high - low) >>> 0) ? 1 : 0)
            }
            if (ok && ((bytes[0] + bytes[1] + bytes[2] + bytes[3]) & 255) == bytes[4]) {
                let humidity = model == ScienceDHTModel.DHT11 ? bytes[0] + bytes[1] / 10 : (bytes[0] * 256 + bytes[1]) / 10
                let temp = model == ScienceDHTModel.DHT11 ? bytes[2] + (bytes[3] & 127) / 10 : ((bytes[2] & 127) * 256 + bytes[3]) / 10
                if (model == ScienceDHTModel.DHT22 && (bytes[2] & 128)) temp = -temp
                if (model == ScienceDHTModel.DHT11 && (bytes[3] & 128)) temp = -temp
                if (humidity >= 0 && humidity <= 100 && temp >= -40 && temp <= 80) { cache.temperature = temp; cache.humidity = humidity }
            }
            cache.at = control.millis()
        }
        let result = value == ScienceClimateValue.Temperature ? cache.temperature : cache.humidity
        dhtBusy = false
        return result
    }
}
namespace scienceWater {
    let waterPin = -1
    let waterAt = -1000
    let waterBusy = false
    let waterValues: number[] = [-127, -127, -127]
    /** a-003/004 DS18B20: use a 3.3V digital port with module pull-up. Up to three probes on one pin, ordered by ROM search, not socket position. Failure=-127 °C. */
    //% blockId=science_water_temp block="water temperature pin $pin probe $probe (°C)" group="Digital"
    //% pin.defl=ScienceDigitalPin.P8 probe.min=1 probe.max=3 probe.defl=1
    export function temperature(pin: ScienceDigitalPin, probe: number): number {
        if (!scienceInternal.validDigital(pin) || probe < 1 || probe > 3 || probe != Math.floor(probe)) return -127
        while (waterBusy) basic.pause(1)
        waterBusy = true
        if (waterPin != pin || control.millis() - waterAt >= 1000) {
            scienceInternal.prepare(pin)
            waterValues = [-127, -127, -127]
            // Re-scan each cycle to recover from disconnects. Read all probes from one conversion.
            scienceWaterDriver.ds18b20SetPin(<DigitalPin><number>pin)
            if (scienceWaterDriver.ds18b20StartConversion()) {
                for (let i = 0; i < 3; i++) {
                    let reading = scienceWaterDriver.ds18b20ReadTemp(i, scienceWaterDriver.DS18B20Unit.Celsius)
                    if (reading >= -55 && reading <= 125) waterValues[i] = reading
                }
            }
            waterPin = pin
            waterAt = control.millis()
        }
        let result = waterValues[probe - 1]
        waterBusy = false
        return result
    }
}
