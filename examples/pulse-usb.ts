// MAX30105/MAX30102 on I2C. Raw red/IR optical counts; no heart-rate or SpO2 calculation.
basic.forever(function () {
    let red = scienceBio.pulseRaw(SciencePulseChannel.Red)
    let infrared = scienceBio.pulseRaw(SciencePulseChannel.Infrared)
    if (red >= 0 && infrared >= 0) scienceData.sendUSB([red, infrared])
    basic.pause(50)
})
