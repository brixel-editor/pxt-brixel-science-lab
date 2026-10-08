// MH-Z19D TX -> P13, RX -> P14; GND shared, regulated 5.0±0.1V supply.
// Paste this example alone into a MakeCode project with the extension installed.
scienceAir.startCO2(ScienceDigitalPin.P13, ScienceDigitalPin.P14)
basic.forever(function () {
    let ppm = scienceAir.co2()
    if (ppm >= 0) scienceData.sendValueUSB(ppm)
    basic.pause(2000)
})
