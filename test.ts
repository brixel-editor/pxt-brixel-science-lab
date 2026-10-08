// Compile every public block path. This sample is for compilation, not unattended hardware execution.
let sample = [
 scienceLight.light(ScienceAnalogPin.P1), scienceLight.uvRaw(ScienceAnalogPin.P1), scienceLight.sound(ScienceAnalogPin.P1),
 scienceWater.soilMoisture(ScienceAnalogPin.P1), scienceWater.water(ScienceAnalogPin.P1), scienceWater.rain(ScienceAnalogPin.P1),
 scienceMotion.vibration(ScienceAnalogPin.P1), scienceMotion.magnet(ScienceAnalogPin.P1), scienceMotion.force(ScienceAnalogPin.P1),
 scienceMotion.rotation(ScienceAnalogPin.P1), scienceMotion.infiniteRotation(ScienceAnalogPin.P1), scienceMotion.slider(ScienceAnalogPin.P1),
 scienceDetection.analogTouch(ScienceAnalogPin.P1), scienceDetection.line(ScienceAnalogPin.P1), scienceDetection.object(ScienceAnalogPin.P1),
 scienceDetection.button(ScienceDigitalPin.P8), scienceDetection.switchValue(ScienceDigitalPin.P8), scienceDetection.touch(ScienceDigitalPin.P8),
 scienceDetection.human(ScienceDigitalPin.P8), scienceDetection.tilt(ScienceDigitalPin.P8), scienceDetection.vibration(ScienceDigitalPin.P8),
 scienceDetection.waterLevel(ScienceDigitalPin.P8), scienceDetection.photoGate(ScienceDigitalPin.P8), scienceDetection.flame(ScienceDigitalPin.P8)
]
scienceData.startBluetooth()
scienceData.sendUSB(sample)
scienceData.sendValueUSB(sample[0])
scienceData.sendValueBluetooth(sample[0])
if (scienceData.bluetoothConnected()) scienceData.sendBluetooth(sample)
// Exercise advanced code generation without executing it on a connected board.
input.onButtonPressed(Button.A, function () {
    let measurements = [
        scienceWeather.sht31(ScienceClimateValue.Temperature),
        scienceWeather.bmp280(SciencePressureValue.Pressure),
        scienceWeather.infraredTemperature(ScienceIRTemperature.Object),
        scienceWeather.dht(ScienceDHTModel.DHT22, ScienceDigitalPin.P8, ScienceClimateValue.Humidity),
        scienceWeather.ntc(ScienceAnalogPin.P1), scienceWeather.pt100(ScienceAnalogPin.P1),
        scienceWater.temperature(ScienceDigitalPin.P8, 1), scienceWater.ph(ScienceAnalogPin.P1),
        scienceWater.tds(ScienceAnalogPin.P1, 25), scienceMotion.weight(),
        scienceMotion.mpu6050(ScienceMotionValue.Acceleration, ScienceAxis.X),
        scienceMotion.joystick(ScienceAnalogPin.P0), scienceDetection.color(ScienceColorChannel.Red),
        scienceDetection.ultrasonic(ScienceDigitalPin.P13, ScienceDigitalPin.P14),
        scienceElectric.current(ScienceAnalogPin.P1), scienceAir.sgp30(ScienceAirValue.ECO2)
    ]
    scienceMotion.zeroGyro()
    scienceWeather.calibratePT100(ScienceAnalogPin.P1, ScienceCalibrationPoint.First, 25)
    scienceWater.calibratePH(ScienceAnalogPin.P1, 7)
    scienceElectric.zeroCurrent(ScienceAnalogPin.P1)
    scienceElectric.calibrateCurrent(ScienceAnalogPin.P1, 0.5)
    scienceDisplay.lcdLine(1, "23.5")
    scienceDisplay.lcdClear()
    scienceDisplay.setOLED(ScienceOLEDType.SH1106)
    scienceDisplay.oledLine(1, "23.5")
    scienceDisplay.oledClear()
    scienceDisplay.pixels(ScienceDigitalPin.P9, 8, SciencePixelColor.Red)
    scienceData.sendUSB(measurements)
})

input.onButtonPressed(Button.B, function () {
 scienceAir.startPMS(ScienceDigitalPin.P13, ScienceDigitalPin.P14)
 scienceMotion.startEncoder(ScienceDigitalPin.P1, ScienceDigitalPin.P2)
 scienceMotion.zeroEncoder()
 scienceData.sendUSB([scienceAir.particulate(SciencePMValue.PM25), scienceAir.ccs811(ScienceAirValue.TVOC), scienceBio.pulseRaw(SciencePulseChannel.Red), scienceMotion.encoderPosition(), scienceWeather.clock(ScienceClockValue.Hour)])
})

input.onLogoEvent(TouchButtonEvent.Pressed, function () {
 scienceAir.startCO2(ScienceDigitalPin.P13, ScienceDigitalPin.P14)
 scienceElectric.setADCAddress(ScienceADCAddress.Address48)
 scienceElectric.calibrateVoltage(ScienceADCChannel.A0, 5)
 scienceWater.calibrateTurbidity(ScienceADCChannel.A1)
 scienceData.sendUSB([scienceAir.co2(),scienceDetection.laserDistance(),scienceDetection.gestureProximity(),scienceDetection.gestureColor(ScienceColorChannel.Red),scienceDetection.gestureDirection(),scienceElectric.voltage(ScienceADCChannel.A0),scienceWater.turbidity(ScienceADCChannel.A1)])
})
