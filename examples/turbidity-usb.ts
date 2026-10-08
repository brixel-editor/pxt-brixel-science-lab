// A_013/A_014 analog module signal -> P1. Keep signal within 0..3.3V and board supply.
// Sends raw 0..1023 without calibration. Not NTU; shield the probe from ambient light.
basic.forever(function () {
    let raw = scienceWater.turbidityRaw(ScienceAnalogPin.P1)
    if (raw >= 0) scienceData.sendValueUSB(raw)
    basic.pause(200)
})
