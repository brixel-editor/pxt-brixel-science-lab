// SGP30과 SHT계열 센서를 I2C에 연결합니다. 첫 유효값까지 예열 시간이 필요합니다.
basic.forever(function () {
    scienceAir.compensateSGP30(scienceWeather.sht31(ScienceClimateValue.Temperature), scienceWeather.sht31(ScienceClimateValue.Humidity))
    basic.pause(2000)
    let value = scienceAir.sgp30(ScienceAirValue.ECO2)
    if (value >= 0) scienceData.sendValueUSB(value)
    basic.pause(8000)
})
