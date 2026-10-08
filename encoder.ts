namespace scienceMotion {
    let encoderA = -1
    let encoderB = -1
    let encoderPrevious = 0
    let encoderPartial = 0
    let encoderCount = 0
    let encoderStarted = false
    const encoderSteps = [0, -1, 1, 0, 1, 0, 0, -1, -1, 0, 0, 1, 0, 1, -1, 0]
    function encoderBits(): number { return pins.digitalReadPin(<DigitalPin>encoderA) * 2 + pins.digitalReadPin(<DigitalPin>encoderB) }
    /** EC11 A/B contacts with common GND, 3.3V pull-ups. Slow hand-turn experiments only; a full four-transition cycle counts once. Pin changes reset the count. */
    //% blockId=science_encoder_start block="start rotary encoder A $a B $b" group="Rotary encoder(EC11)"
    //% a.defl=ScienceDigitalPin.P13 b.defl=ScienceDigitalPin.P14
    export function startEncoder(a: ScienceDigitalPin, b: ScienceDigitalPin): void {
        encoderA = -1; encoderB = -1; encoderCount = 0; encoderPartial = 0
        if (a == b || !scienceInternal.validDigital(a) || !scienceInternal.validDigital(b)) return
        scienceInternal.prepare(a); scienceInternal.prepare(b)
        pins.setPull(<DigitalPin><number>a, PinPullMode.PullUp)
        pins.setPull(<DigitalPin><number>b, PinPullMode.PullUp)
        encoderA = a; encoderB = b; encoderPrevious = encoderBits()
        if (!encoderStarted) {
            encoderStarted = true
            control.inBackground(function () {
                while (true) {
                    if (encoderA >= 0) {
                        let bits = encoderBits()
                        if ((bits ^ encoderPrevious) == 3) encoderPartial = 0
                        else encoderPartial += encoderSteps[encoderPrevious * 4 + bits]
                        if (encoderPartial >= 4) { encoderCount++; encoderPartial = 0 }
                        if (encoderPartial <= -4) { encoderCount--; encoderPartial = 0 }
                        encoderPrevious = bits
                    }
                    basic.pause(1)
                }
            })
        }
    }
    /** Signed EC11 quadrature cycles since start/zero. Direction reverses when A and B are swapped. Not a high-speed rotation counter. Invalid setup=-9999. */
    //% blockId=science_encoder_value block="rotary encoder count" group="Rotary encoder(EC11)"
    export function encoderPosition(): number { return encoderA < 0 ? -9999 : encoderCount }
    /** Reset the EC11 count and incomplete cycle to zero. */
    //% blockId=science_encoder_zero block="rotary encoder zero count" group="Rotary encoder(EC11)"
    export function zeroEncoder(): void { encoderCount = 0; encoderPartial = 0 }
}
