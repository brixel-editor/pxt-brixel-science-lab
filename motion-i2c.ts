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
    function mpuInit(): boolean {
        let id = scienceBus.register(0x68, 0x75, 1)
        if (!id || id[0] != 0x68) return false
        if (!scienceBus.write(0x68, [0x6B, 1])) return false
        basic.pause(100)
        return scienceBus.write(0x68, [0x19, 0]) && scienceBus.write(0x68, [0x1A, 0]) &&
            scienceBus.write(0x68, [0x1B, 8]) && scienceBus.write(0x68, [0x1C, 0])
    }
    /** i2c-007: I2C MPU6050, ±2 g / ±500 °/s. Same-address RTC cannot share the bus. Failure=-999. */
    //% blockId=science_mpu6050 block="MPU6050 $value axis $axis" group="I2C"
    export function mpu6050(value: ScienceMotionValue, axis: ScienceAxis): number {
        if (axis < 0 || axis > 2) return -999
        scienceBus.acquire()
        if (control.millis() - mpuAt >= 20) {
            if (!mpuReady) mpuReady = mpuInit()
            mpuFrame = mpuReady ? scienceBus.register(0x68, 0x3B, 14) : null
            if (!mpuFrame) mpuReady = false
            mpuAt = control.millis()
        }
        let result = -999
        if (mpuFrame) {
            if (value == ScienceMotionValue.Acceleration) result = scienceBus.signedBE(mpuFrame, axis * 2) / 16384
            else result = scienceBus.signedBE(mpuFrame, 8 + axis * 2) / 65.5 - gyroOffsets[axis]
        }
        scienceBus.release()
        return result
    }
    /** Keep MPU6050 still for about one second. Only gyro zero is adjusted; gravity remains in acceleration. */
    //% blockId=science_gyro_zero block="zero gyro while still" group="I2C"
    export function zeroGyro(): void {
        scienceBus.acquire()
        if (!mpuReady) mpuReady = mpuInit()
        let sum = [0, 0, 0]
        let ok = mpuReady
        for (let i = 0; i < 50 && ok; i++) {
            let data = scienceBus.register(0x68, 0x3B, 14)
            if (!data) { ok = false; break }
            for (let axis = 0; axis < 3; axis++) sum[axis] += scienceBus.signedBE(data, 8 + axis * 2) / 65.5
            basic.pause(20)
        }
        if (ok) for (let axis = 0; axis < 3; axis++) gyroOffsets[axis] = sum[axis] / 50
        mpuFrame = null
        mpuAt = -1000
        scienceBus.release()
    }
    /** i2c-010 MCU/HX711 module, I2C address 0x63; connect its load-cell plate. Raw module reading, unit must be verified. Failure=-1. */
    //% blockId=science_weight block="weight module reading" group="I2C"
    export function weight(): number {
        scienceBus.acquire()
        // This module is a stream, not a register device. Never write a probe register or tare opcode.
        let data = scienceBus.read(0x63, 3)
        let result = data && data[0] == 255 ? scienceBus.be16(data, 1) : -1
        scienceBus.release()
        return result
    }
    /** a-028 joystick: connect the selected X or Y signal to a 3.3V analog pin. Returns 0..1023. */
    //% blockId=science_joystick block="joystick axis pin $pin value" group="Analog" pin.defl=ScienceAnalogPin.P0
    export function joystick(pin: ScienceAnalogPin): number { return scienceInternal.analog(pin) }
}
namespace scienceDetection {
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
    //% blockId=science_tcs34725 block="color sensor $channel count" group="I2C"
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
    //% blockId=science_ultrasonic block="ultrasonic trigger $trigger echo $echo distance (cm)" group="Digital"
    //% trigger.defl=ScienceDigitalPin.P13 echo.defl=ScienceDigitalPin.P14
    export function ultrasonic(trigger: ScienceDigitalPin, echo: ScienceDigitalPin): number {
        if (!scienceInternal.validDigital(trigger) || !scienceInternal.validDigital(echo) || trigger == echo) return -1
        scienceInternal.prepare(trigger)
        scienceInternal.prepare(echo)
        let t = <DigitalPin><number>trigger
        let e = <DigitalPin><number>echo
        pins.setPull(e, PinPullMode.PullNone)
        pins.digitalWritePin(t, 0)
        control.waitMicros(2)
        pins.digitalWritePin(t, 1)
        control.waitMicros(10)
        pins.digitalWritePin(t, 0)
        let duration = pins.pulseIn(e, PulseValue.High, 30000)
        return duration > 0 ? Math.round(duration / 58.31 * 100) / 100 : -1
    }
}
