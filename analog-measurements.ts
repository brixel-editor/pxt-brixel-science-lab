namespace scienceElectric {
    let voltagePins: number[] = []
    let voltagePerCount: number[] = []
    /** A_034 voltage divider signal to the selected micro:bit analog pin. Raw 0..1023, no calibration needed. Signal must stay within 0..3.3V and board supply; never connect the measured voltage directly. Invalid pin=-1. */
    //% blockId=science_voltage_raw block="voltage sensor pin $pin raw value" group="Voltage" weight=90
    //% pin.defl=ScienceAnalogPin.P1
    export function voltageRaw(pin: ScienceAnalogPin): number { return scienceInternal.analog(pin) }

    /** Apply a known positive DC voltage through the divider and capture its analog value. The safe measured range depends on the divider and input voltage limit, not the module's 25V label. Reference 0.1..25V; raw 5..1022 required. Per-pin calibration resets on program restart. */
    //% blockId=science_voltage_pin_calibrate block="voltage sensor pin $pin calibrate at $voltage V" group="Voltage" weight=70
    //% pin.defl=ScienceAnalogPin.P1 voltage.defl=5 voltage.min=0.1 voltage.max=25
    export function calibrateVoltage(pin: ScienceAnalogPin, voltage: number): void {
        let index = voltagePins.indexOf(pin)
        if (index >= 0) voltagePerCount[index] = 0
        if (!scienceInternal.finite(voltage) || voltage < 0.1 || voltage > 25) return
        let raw = voltageRaw(pin)
        if (raw < 5 || raw >= 1023) return
        if (index < 0) { index = voltagePins.length; voltagePins.push(pin); voltagePerCount.push(0) }
        voltagePerCount[index] = voltage / raw
    }

    /** DC voltage calculated from the selected analog pin after reference calibration. Raw 0 is a valid zero voltage. Missing calibration, invalid pin, ADC saturation or outside 0..25V=-1. Actual safe input range depends on the divider. */
    //% blockId=science_voltage_pin block="voltage sensor pin $pin voltage (V)" group="Voltage" weight=80
    //% pin.defl=ScienceAnalogPin.P1
    export function voltage(pin: ScienceAnalogPin): number {
        let index = voltagePins.indexOf(pin)
        if (index < 0 || voltagePerCount[index] <= 0) return -1
        let raw = voltageRaw(pin)
        if (raw < 0 || raw >= 1023) return -1
        let result = raw * voltagePerCount[index]
        return result <= 25 ? result : -1
    }
}
namespace scienceWater {
    let turbidityPins: number[] = []
    let clearWaterCounts: number[] = []
    /** A_013/A_014 turbidity module signal to the selected micro:bit analog pin. Raw 0..1023, no calibration needed; not NTU. Signal must stay within 0..3.3V and board supply. Invalid pin=-1; disconnection cannot be reliably detected. */
    //% blockId=science_turbidity_raw block="turbidity sensor pin $pin raw value" group="Turbidity(AZDM01)" weight=90
    //% pin.defl=ScienceAnalogPin.P1
    export function turbidityRaw(pin: ScienceAnalogPin): number { return scienceInternal.analog(pin) }

    /** Put the probe in clear water, shield ambient light and capture the selected analog input. Raw 5..1022 required. Invalid recalibration clears the old reference on that pin. Calibration resets on program restart. */
    //% blockId=science_turbidity_pin_calibrate block="turbidity sensor pin $pin calibrate clear water" group="Turbidity(AZDM01)" weight=70
    //% pin.defl=ScienceAnalogPin.P1
    export function calibrateTurbidity(pin: ScienceAnalogPin): void {
        let index = turbidityPins.indexOf(pin)
        if (index >= 0) clearWaterCounts[index] = 0
        let raw = turbidityRaw(pin)
        if (raw < 5 || raw >= 1023) return
        if (index < 0) { index = turbidityPins.length; turbidityPins.push(pin); clearWaterCounts.push(0) }
        clearWaterCounts[index] = raw
    }

    /** Relative transmission from the analog signal: clear water=100%, lower means cloudier. Not NTU. Raw zero is valid 0%. Missing calibration, invalid pin, ADC saturation or over 120%=-1. */
    //% blockId=science_turbidity_pin block="turbidity sensor pin $pin transmission (%)" group="Turbidity(AZDM01)" weight=80
    //% pin.defl=ScienceAnalogPin.P1
    export function turbidity(pin: ScienceAnalogPin): number {
        let index = turbidityPins.indexOf(pin)
        if (index < 0 || clearWaterCounts[index] <= 0) return -1
        let raw = turbidityRaw(pin)
        if (raw < 0 || raw >= 1023) return -1
        let result = raw * 100 / clearWaterCounts[index]
        return result <= 120 ? result : -1
    }
}
