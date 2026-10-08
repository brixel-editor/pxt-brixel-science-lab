// AS608: TX -> P13, RX -> P14. Use the module's rated supply and 3.3V-compatible UART.
// Button A: 1st enrollment. Lift and replace the SAME finger. B within 60s: 2nd enrollment at ID 1.
// Saving replaces any existing template at ID 1. Logo: find and send matched ID only.
scienceBio.startFingerprint(ScienceDigitalPin.P13, ScienceDigitalPin.P14, ScienceSensorBaud.Baud57600)
input.onButtonPressed(Button.A, function () {
    scienceBio.enrollFingerprint(ScienceFingerprintStep.First, 1)
    if (scienceBio.fingerprintStatus() == 0) basic.showIcon(IconNames.Yes)
    else basic.showNumber(scienceBio.fingerprintStatus())
})
input.onButtonPressed(Button.B, function () {
    scienceBio.enrollFingerprint(ScienceFingerprintStep.Second, 1)
    if (scienceBio.fingerprintStatus() == 0) basic.showIcon(IconNames.Yes)
    else basic.showNumber(scienceBio.fingerprintStatus())
})
input.onLogoEvent(TouchButtonEvent.Pressed, function () {
    let id = scienceBio.fingerprintID()
    if (id >= 0) scienceData.sendValueUSB(id)
    else basic.showNumber(scienceBio.fingerprintStatus())
})
