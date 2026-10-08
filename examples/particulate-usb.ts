// PMS7003 (4-pin) active mode, sensor TX -> P13, RX -> P14; 5V supply, 3.3V UART.
// PMS3003 (3-pin, TX only): use scienceAir.startPMS3003(ScienceDigitalPin.P9) instead.
scienceAir.startPMS(ScienceDigitalPin.P13, ScienceDigitalPin.P14)
basic.forever(function () {
    let pm1 = scienceAir.particulate(SciencePMValue.PM1)
    let pm25 = scienceAir.particulate(SciencePMValue.PM25)
    let pm10 = scienceAir.particulate(SciencePMValue.PM10)
    if (pm1 >= 0 && pm25 >= 0 && pm10 >= 0) scienceData.sendUSB([pm1, pm25, pm10])
    basic.pause(1000)
})
