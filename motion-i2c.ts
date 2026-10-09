enum ScienceAxis {
    //% block="X"
    X = 0,
    //% block="Y"
    Y = 1,
    //% block="Z"
    Z = 2
}
enum ScienceMotionValue {
    //% block="acceleration (g)"
    Acceleration = 0,
    //% block="angular velocity (°/s)"
    Gyro = 1
}
enum ScienceGravityReference {
    //% block="+1 g (axis up)"
    Positive = 0,
    //% block="-1 g (axis down)"
    Negative = 1
}
enum ScienceColorChannel {
    //% block="red"
    Red = 0,
    //% block="green"
    Green = 1,
    //% block="blue"
    Blue = 2,
    //% block="clear"
    Clear = 3
}
namespace scienceMotion {
    let mpuReady = false
    let mpuAt = -1000
    let mpuFrame: Buffer = null
    let gyroOffsets: number[] = [0, 0, 0]
    let gyroCalibrationFailed = false
    let accelPositive: number[] = [0, 0, 0]
    let accelNegative: number[] = [0, 0, 0]
    let accelCalibrated: boolean[] = [false, false, false]
    function mpuInit(): boolean {
        let id = scienceBus.register(0x68, 0x75, 1)
        if (!id || id[0] != 0x68) return false
        if (!scienceBus.write(0x68, [0x6B, 1])) return false
        basic.pause(100)
        return scienceBus.write(0x68, [0x19, 0]) && scienceBus.write(0x68, [0x1A, 0]) &&
            scienceBus.write(0x68, [0x1B, 8]) && scienceBus.write(0x68, [0x1C, 0])
    }
    /** i2c-007: I2C MPU6050, ±2 g / ±500 °/s. Same-address RTC cannot share the bus. Failure=-999. */
    //% blockId=science_mpu6050 block="MPU6050 $value axis $axis" group="Motion(MPU6050)"
    export function mpu6050(value: ScienceMotionValue, axis: ScienceAxis): number {
        if (axis < 0 || axis > 2 || axis != Math.floor(axis) || (value != 0 && value != 1)) return -999
        scienceBus.acquire()
        if (control.millis() - mpuAt >= 20) {
            if (!mpuReady) mpuReady = mpuInit()
            mpuFrame = mpuReady ? scienceBus.register(0x68, 0x3B, 14) : null
            if (!mpuFrame) mpuReady = false
            mpuAt = control.millis()
        }
        let result = -999
        if (mpuFrame) {
            if (value == ScienceMotionValue.Acceleration) {
                result = scienceBus.signedBE(mpuFrame, axis * 2) / 16384
                if (accelCalibrated[axis]) {
                    if (accelPositive[axis] <= 0 || accelNegative[axis] >= 0) result = -999
                    else result = (result - (accelPositive[axis] + accelNegative[axis]) / 2) * 2 / (accelPositive[axis] - accelNegative[axis])
                }
            } else if (!gyroCalibrationFailed) result = scienceBus.signedBE(mpuFrame, 8 + axis * 2) / 65.5 - gyroOffsets[axis]
        }
        scienceBus.release()
        return result
    }
    /** Keep MPU6050 still for about one second. Only gyro zero is adjusted; gravity remains in acceleration. */
    //% blockId=science_gyro_zero block="zero gyro while still" group="Motion(MPU6050)"
    export function zeroGyro(): void {
        scienceBus.acquire()
        gyroCalibrationFailed = true
        if (!mpuReady) mpuReady = mpuInit()
        let sum = [0, 0, 0]
        let low = [1000, 1000, 1000], high = [-1000, -1000, -1000]
        let ok = mpuReady
        for (let i = 0; i < 50 && ok; i++) {
            let data = scienceBus.register(0x68, 0x3B, 14)
            if (!data) { ok = false; break }
            for (let axis = 0; axis < 3; axis++) {
                let speed = scienceBus.signedBE(data, 8 + axis * 2) / 65.5
                sum[axis] += speed; low[axis] = Math.min(low[axis], speed); high[axis] = Math.max(high[axis], speed)
            }
            basic.pause(20)
        }
        for (let axis = 0; axis < 3; axis++) if (high[axis] - low[axis] > 5) ok = false
        if (ok) {
            for (let axis = 0; axis < 3; axis++) gyroOffsets[axis] = sum[axis] / 50
            gyroCalibrationFailed = false
        }
        mpuFrame = null
        mpuAt = -1000
        scienceBus.release()
    }
    /** For each axis, point its positive arrow straight up (+1g), then straight down (-1g), keeping still for 1s each. Six captures correct axis offset/scale, not misalignment. Gravity is retained. Partial/failed calibration=-999 on that axis. Lost on restart. */
    //% blockId=science_accel_calibrate block="accelerometer axis $axis calibrate $reference" group="Motion(MPU6050)"
    export function calibrateAcceleration(axis: ScienceAxis, reference: ScienceGravityReference): void {
        if (axis < 0 || axis > 2 || axis != Math.floor(axis)) return
        scienceBus.acquire()
        accelCalibrated[axis] = true
        if (reference == 0 || reference != 1) { accelPositive[axis] = 0; accelNegative[axis] = 0 }
        else accelNegative[axis] = 0
        let ok = reference == 0 || reference == 1
        if (ok && !mpuReady) mpuReady = mpuInit()
        ok = ok && mpuReady
        let sum = 0, low = 3, high = -3
        for (let i = 0; i < 50 && ok; i++) {
            let data = scienceBus.register(0x68, 0x3B, 14)
            if (!data) { ok = false; break }
            let g = scienceBus.signedBE(data, axis * 2) / 16384
            if ((reference == 0 && (g < 0.7 || g > 1.3)) || (reference == 1 && (g < -1.3 || g > -0.7))) { ok = false; break }
            sum += g; low = Math.min(low, g); high = Math.max(high, g)
            basic.pause(20)
        }
        if (ok && high - low <= 0.05) {
            if (reference == 0) accelPositive[axis] = sum / 50
            else accelNegative[axis] = sum / 50
        }
        mpuFrame = null; mpuAt = -1000
        scienceBus.release()
    }
    /** i2c-010 MCU/HX711 module, I2C address 0x63; connect its load-cell plate. The module sends whole grams and zeros itself when its power comes on, so keep the plate empty at power-on. No reply=-1. */
    //% blockId=science_weight block="weight module reading" group="Weight"
    export function weight(): number {
        scienceBus.acquire()
        // This module is a stream, not a register device. Never write a probe register or tare opcode.
        // Read with the core call, which ignores the I2C status: on micro:bit V2 this module's (ATmega slave)
        // reply ends with a status CODAL reports as an error although the 3 bytes are valid, so
        // scienceBus.read (status-checked) always failed (-1). Field-verified 10-09 via the physical-computing extension.
        // No device -> NACK -> zero buffer -> [0] != 0xFF. Floating lines -> FF FF FF -> rejected (real values stay < ~3.2kg).
        let data = pins.i2cReadBuffer(0x63, 3)
        let valid = data.length == 3 && data[0] == 0xFF && !(data[1] == 0xFF && data[2] == 0xFF)
        let result = valid ? scienceBus.be16(data, 1) : -1
        scienceBus.release()
        return result
    }
    /** a-028 joystick: connect the selected X or Y signal to a 3.3V analog pin. Returns 0..1023. */
    //% blockId=science_joystick block="joystick axis pin $pin value" group="Analog" pin.defl=ScienceAnalogPin.P0
    export function joystick(pin: ScienceAnalogPin): number { return scienceInternal.analog(pin) }
}
namespace scienceDetection {
    let ultrasonicTemperature = 20
    let ultrasonicPairs: number[] = []
    let ultrasonicOffsets: number[] = []
    /** Ambient air temperature for sound-speed compensation (0..50 C). Default 20 C. Not suitable for water. Invalid input disables distance until a valid temperature is supplied. Lost on restart. */
    //% blockId=science_ultrasonic_temperature block="ultrasonic ambient temperature $temperature °C" group="Ultrasonic distance"
    //% temperature.defl=20 temperature.min=0 temperature.max=50
    export function setUltrasonicTemperature(temperature: number): void {
        ultrasonicTemperature = scienceInternal.finite(temperature) && temperature >= 0 && temperature <= 50 ? temperature : -999
    }
    /** Set temperature first, then measure a flat perpendicular target with a ruler (10..300cm). Captures 8 echoes to correct a small mounting offset (within 10cm), not reflectivity or sound speed. Lost on restart; failed capture makes this pair unavailable until recalibrated. */
    //% blockId=science_ultrasonic_calibrate block="ultrasonic echo $echo trigger $trigger calibrate distance $cm cm" group="Ultrasonic distance"
    //% echo.defl=ScienceDigitalPin.P13 trigger.defl=ScienceDigitalPin.P14 cm.defl=30 cm.min=10 cm.max=300
    export function calibrateUltrasonic(trigger: ScienceDigitalPin, echo: ScienceDigitalPin, cm: number): void {
        if (!scienceInternal.validDigital(trigger) || !scienceInternal.validDigital(echo) || trigger == echo) return
        let key = trigger * 1000 + echo
        let index = ultrasonicPairs.indexOf(key)
        if (index < 0) { index = ultrasonicPairs.length; ultrasonicPairs.push(key); ultrasonicOffsets.push(-999) }
        ultrasonicOffsets[index] = -999
        if (!scienceInternal.finite(cm) || cm < 10 || cm > 300) return
        let sum = 0, low = 1000, high = 0
        for (let i = 0; i < 8; i++) {
            let value = ultrasonicRaw(trigger, echo)
            if (value < 0) return
            sum += value; low = Math.min(low, value); high = Math.max(high, value)
            basic.pause(60)
        }
        let offset = cm - sum / 8
        if (high - low <= 2 && Math.abs(offset) <= 10) ultrasonicOffsets[index] = offset
    }
    let colorReady = false
    let colorAt = -1000
    let colorFrame: Buffer = null
    function colorInit(): boolean {
        let id = scienceBus.register(0x29, 0x92, 1)
        if (!id || (id[0] != 0x44 && id[0] != 0x4D)) return false
        if (!scienceBus.write(0x29, [0x80, 1])) return false
        basic.pause(3)
        if (!scienceBus.write(0x29, [0x81, 0xC0]) || !scienceBus.write(0x29, [0x8D, 0]) ||
            !scienceBus.write(0x29, [0x8F, 2]) || !scienceBus.write(0x29, [0x80, 3])) return false
        basic.pause(160)
        return true
    }
    /** i2c-012 TCS34725: I2C, raw light counts 0..65535. Do not share address 0x29 with VL53L0X. Failure=-1. */
    //% blockId=science_tcs34725 block="color sensor $channel count" group="Color(TCS34725)"
    export function color(channel: ScienceColorChannel): number {
        if (channel < 0 || channel > 3) return -1
        scienceBus.acquire()
        if (control.millis() - colorAt >= 160) {
            colorFrame = null
            if (!colorReady) colorReady = colorInit()
            if (colorReady) {
                let status = scienceBus.register(0x29, 0x93, 1)
                if (status && (status[0] & 1)) colorFrame = scienceBus.register(0x29, 0xB4, 8)
                if (!status) colorReady = false
            }
            colorAt = control.millis()
        }
        let result = colorFrame ? scienceBus.u16(colorFrame, channel == ScienceColorChannel.Clear ? 0 : 2 + channel * 2) : -1
        scienceBus.release()
        return result
    }
    /** Two-signal ultrasonic only: connect separate TRIG and ECHO. A 3-pin single-signal module requires another protocol and is not supported here. Level-shift 5V ECHO. No echo=-1 cm. */
    //% blockId=science_ultrasonic block="ultrasonic echo $echo trigger $trigger distance (cm)" group="Ultrasonic distance"
    //% echo.defl=ScienceDigitalPin.P13 trigger.defl=ScienceDigitalPin.P14
    export function ultrasonic(trigger: ScienceDigitalPin, echo: ScienceDigitalPin): number {
        let raw = ultrasonicRaw(trigger, echo)
        if (raw < 0) return -1
        let index = ultrasonicPairs.indexOf(trigger * 1000 + echo)
        let offset = index < 0 ? 0 : ultrasonicOffsets[index]
        let value = raw + offset
        return offset != -999 && value >= 0 ? Math.round(value * 100) / 100 : -1
    }
    function ultrasonicRaw(trigger: ScienceDigitalPin, echo: ScienceDigitalPin): number {
        if (!scienceInternal.validDigital(trigger) || !scienceInternal.validDigital(echo) || trigger == echo) return -1
        if (ultrasonicTemperature == -999) return -1
        scienceInternal.prepare(trigger)
        scienceInternal.prepare(echo)
        // Native polling measurement (scienceNative.echoPulse), not pins.pulseIn: on V2 the
        // event-based pulseIn worked briefly and then returned only timeouts in field tests.
        // A single missed echo is common (soft or angled target); try up to 3 pings before reporting -1.
        let duration = 0
        for (let i = 0; i < 3 && duration <= 0; i++) {
            if (i > 0) basic.pause(60)
            duration = scienceNative.echoPulse(trigger, echo, 30000)
        }
        return duration > 0 ? duration * (331 + 0.6 * ultrasonicTemperature) / 20000 : -1
    }
}
