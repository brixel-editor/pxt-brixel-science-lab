# 단독 실행 예제

MakeCode micro:bit 프로젝트에 이 확장을 추가하고, 사용할 파일 **하나만** JavaScript 편집기에 붙여 넣습니다. 이 폴더를 통째로 한 프로그램에 넣지 않습니다. 예제의 P핀은 실제 연결에 맞게 바꿉니다.

| 파일 | 연결·전송 |
|---|---|
| co2-usb.ts | MH-Z19D 시작 후 60초 대기, CO₂ ppm 한 열 |
| particulate-usb.ts | PMS3003/7003 자동 모드, 30초 대기, PM1/PM2.5/PM10 세 열 |
| ultrasonic-usb.ts | G/V/ECHO/TRIG, DSL P13/P14의 echo=P13·trigger=P14, cm 한 열 |
| gesture-usb.ts | APDS9960, 근접·R/G/B·손짓 번호 다섯 열 |
| pulse-usb.ts | MAX30102, 50ms 간격 빨간빛·적외선 두 열 |
| gps-usb.ts | D_031 GPS, 9600 baud, 위도·경도 두 열. 위치 미확인 시 전송 없음 |
| fingerprint-usb.ts | AS608, A=첫 읽기, 손가락 떼고 B=번호 1에 저장(기존 지문 덮어씀), 로고=인식 번호 한 열 |
| analog-dust-usb.ts | A_016/017/018, 분압된 VO=P1·전압 호환 LED 구동=P8, 원시값 한 열 |
| voltage-usb.ts | A_034 전압 센서 출력→P1, 보정 없이 아날로그 원시값 0~1023 한 열 |
| turbidity-usb.ts | A_013/A_014 탁도 센서 출력→P1, 보정 없이 아날로그 원시값 0~1023 한 열 |

바우어버드는 USB 115200 baud, 구분자 쉼표를 선택합니다. 예열·실패값은 보내지 않습니다. 유효값이 생기기 전 그래프가 비어 있는 것은 정상입니다. BLE로 바꿀 때는 시작 시 `scienceData.startBluetooth()`를 넣고 `sendUSB`/`sendValueUSB`를 대응하는 Bluetooth 함수로 바꿉니다.

전압(V)이 필요하면 안전한 기준 전압을 분압 모듈에 인가한 뒤 `scienceElectric.calibrateVoltage(ScienceAnalogPin.P1, 5)`처럼 실제 기준값으로 보정하고 `scienceElectric.voltage(ScienceAnalogPin.P1)`를 읽습니다. 탁도 투과율(%)은 맑은 물에서 `scienceWater.calibrateTurbidity(ScienceAnalogPin.P1)`를 실행한 뒤 `scienceWater.turbidity(ScienceAnalogPin.P1)`를 읽습니다. 보정한 값이 -1이면 보내지 않습니다. 센서·배선·전원·핀을 바꾸거나 프로그램을 재시작하면 다시 보정합니다.

센서 전원·신호 전압과 주소 조건은 상위 README.md를 따릅니다. 여기의 UART RX/TX는 micro:bit 기준입니다. PMS·MH-Z19D·GPS·AS608은 센서 UART를 공유하므로 한 프로그램에서 하나를 선택합니다. 예제는 소프트웨어 API와 대조했으며 실물 실행은 아직 하지 않았습니다.
