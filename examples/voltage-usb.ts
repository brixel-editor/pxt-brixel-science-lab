// A_034 divider module signal -> P1. Output must stay within 0..3.3V and board supply.
// Sends raw 0..1023 without calibration; never connect measured voltage directly to P1.
basic.forever(function () {
    let raw = scienceElectric.voltageRaw(ScienceAnalogPin.P1)
    if (raw >= 0) scienceData.sendValueUSB(raw)
    basic.pause(200)
})
