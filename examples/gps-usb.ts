// D_031 GPS + D_032 antenna; match module baud and 3.3V-compatible UART levels.
scienceMotion.startGPS(ScienceDigitalPin.P13, ScienceDigitalPin.P14, ScienceSensorBaud.Baud9600)
basic.forever(function () {
    let latitude = scienceMotion.gps(ScienceGPSValue.Latitude)
    let longitude = scienceMotion.gps(ScienceGPSValue.Longitude)
    if (latitude != -9999 && longitude != -9999) scienceData.sendUSB([latitude, longitude])
    basic.pause(1000)
})
