// Confirmed module order: G / V / ECHO / TRIG.
// DSL G/V/P13/P14 connector: ECHO=P13, TRIG=P14. Level-shift a 5V ECHO.
basic.forever(function () {
    let cm = scienceDetection.ultrasonic(ScienceDigitalPin.P14, ScienceDigitalPin.P13)
    if (cm >= 0) scienceData.sendValueUSB(cm)
    basic.pause(200)
})
