# Source provenance

The local BRIXEL extension declares the MIT license in `_sources/brixel-final-dev_20260725/pxt.json`. The seven-file source snapshot and original paths are recorded with SHA256 in `_sources/manifest.json`. Existing source files were preserved; only the new science extension is edited.

| Current file | Source / adaptation |
|---|---|
| lcd-driver.ts | LCD1602 section of 01_displays.ts, original block annotations removed |
| oled-driver.ts | SSD1306/SH1106 section of 02_adv_displays.ts, original font/drawing code, added complete text-row clearing |
| water-driver.ts | DS18B20 section of 03_sensors.ts, open-drain release, family filtering, three-probe limit, stricter scratchpad validation |
| climate.ts | BRIXEL 04_adv_sensors.ts formulas; command/CRC/read error handling rebuilt; GXHT30 manufacturer protocol checked |
| motion-i2c.ts | BRIXEL MPU6050/TCS34725 and documented 0x63 weight protocol; sensor ID, transfer result and cache handling rebuilt |
| analog-science.ts | BRIXEL NTC/TDS calculation paths with 3.3V ADC scale; explicit two-point/reference calibration instead of unverified module gains |
| digital-sensors.ts | DHT pulse protocol and DS18B20 wrapper; bounded waits, model validation, per-pin DHT cache |
| air.ts | SGP30 IAQ commands from original driver, CRC/feature check, mandatory periodic measurement and warmup added |
| native.cpp | Original small adapter to PXT/CODAL APIs, read status preserved and hardware NeoPixel selected |
| communication.ts | Original thin USB/Nordic UART sender, matched to actual Bowerbird V3 receivers |

Reproduce the three extracted drivers with `node tools/extract-drivers.js`. The script includes all intentional changes to those files. Source snapshots and inventory documents are not listed in `pxt.json.files` and are not sent as firmware source.

## Primary references checked

- [GXCAS GXHT30 datasheet V3.7, manufacturer-authored copy](https://datasheet.lcsc.com/datasheet/pdf/7784301e7aced18c672d0d6c9d1dbc55.pdf?productCode=C2913569): sections 6.4, 7.3, 7.11, 7.12; address, conversion command, CRC, temperature/humidity formulas.
- [Winson WCS2801 datasheet](https://www.winson.com.tw/uploads/images/WCS2801.pdf): 3.3V operation and voltage-dependent sensitivity. Code requires actual reference-current calibration rather than treating the 5V sensitivity as a fixed 3.3V gain.
- [CODAL nRF52 neopixel header at the pinned commit](https://github.com/lancaster-university/codal-nrf52/blob/1fbb7240290fe36a55c61378f5cdeb7640f3ec4a/inc/neopixel.h): HARDWARE_NEOPIXEL defaults to 0. The extension explicitly sets it to 1.
- [CODAL nRF52 neopixel implementation](https://github.com/lancaster-university/codal-nrf52/blob/1fbb7240290fe36a55c61378f5cdeb7640f3ec4a/source/neopixel.cpp): hardware PWM2/WS2812B path.
- [CODAL WS2812B implementation](https://github.com/lancaster-university/codal-nrf52/blob/1fbb7240290fe36a55c61378f5cdeb7640f3ec4a/source/WS2812B.cpp): `play` is blocking until consumption of its DMA stream.
- [MakeCode block definitions](https://makecode.com/defining-blocks): category/group metadata and argument syntax. Installed pxt-core 13.0.1 uses `{id:group}` translation keys.

Compiler: pxt-microbit 9.1.1 / pxt-core 13.0.1, CODAL microbit-v2 v0.3.5. Runtime libraries retain their upstream licenses. Source-based verification does not establish physical module performance or timing reliability.

Workbook evidence and contradictions are recorded in `_research/06_inventory_reconciliation.md`. Earlier investigations `_research/01` through `05` contain historical assumptions; use the latest reconciliation and current source when they disagree.

## 0.3.0 driver additions (2026-10-08)

| File | Reference and adaptation |
|---|---|
| distance.ts | Pololu VL53L0X initialization, SPAD selection, tuning table and 33ms timing-budget math; bounded waits, ACK and raw status checks added |
| gesture.ts | Shawn Hymel / SparkFun APDS9960 configuration and endpoint-ratio method; asynchronous bounded FIFO polling, 4 directions only |
| pulse.ts | SparkFun MAX3010x register setup and Analog Devices MAX30105/MAX30102 datasheets; common two-LED red/IR mode 0x03, raw FIFO, overflow and reset detection; no medical metrics |
| ccs811.ts | SparkFun CCS811 register sequence and manufacturer run-in specification; ID, state, stale-data checks |
| native.cpp, uart.ts | CODAL NRF52Serial / Serial APIs; UARTE1 for sensors, UARTE0 stays assigned to USB; one selected UART sensor |
| particulate.ts | Plantower PMS3003/7003 manufacturer frames, length 20/28, atmospheric concentration, checksum; reserved bytes left uninterpreted |
| co2.ts | Existing BRIXEL MH-Z19 code + Winsen 0x86 read-frame reference; bounded response parser, 60s MH-Z19D warmup; no calibration commands |
| external-adc.ts | TI ADS1115 single-shot register protocol; separate channel calibration; AZDM01 relative transmission against actual clear-water output |
| encoder.ts, clock.ts | Original quadrature state machine and DS1307 BCD read/validation; no external code copied |

Pinned vendor/runtime snapshots (all hashes verified by tools/check.js):

- [codal-nrf52/NRF52Serial.cpp](https://raw.githubusercontent.com/lancaster-university/codal-nrf52/1fbb7240290fe36a55c61378f5cdeb7640f3ec4a/source/NRF52Serial.cpp)
- [pololu-vl53l0x/VL53L0X.cpp](https://raw.githubusercontent.com/pololu/vl53l0x-arduino/9f3773cb48d4e4e844d689cfc529a06f96d1d264/VL53L0X.cpp)
- [sparkfun-apds9960/SparkFun_APDS9960.cpp](https://raw.githubusercontent.com/sparkfun/SparkFun_APDS-9960_Sensor_Arduino_Library/bb9633dd1ea27c64164d3405b936caa287b7c83f/src/SparkFun_APDS9960.cpp)
- [sparkfun-max3010x/MAX30105.cpp](https://raw.githubusercontent.com/sparkfun/SparkFun_MAX3010x_Sensor_Library/72d5308df500ae1a64cc9d63e950c68c96dc78d5/src/MAX30105.cpp)
- [sparkfun-ccs811/SparkFunCCS811.cpp](https://raw.githubusercontent.com/sparkfun/SparkFun_CCS811_Arduino_Library/287aa5c6120ea3227f7fa6fdef4f2253888ea2f2/src/SparkFunCCS811.cpp)
- [codal-core/Serial.h](https://raw.githubusercontent.com/lancaster-university/codal-core/e6b061f2a6d8977811e3025da387d3007e5796f2/inc/driver-models/Serial.h)

Additional primary references:

- [Winsen MH-Z19D V1.3](https://www.winsen-sensor.com/d/files/manual/mh-z19d.pdf): D model power, UART interface, 60s preheat. The user confirmed MH-Z19D and UART on 2026-10-08. This short manual omits command tables.
- [Winsen MH-Z19C V1.2](https://www.winsen-sensor.com/d/files/manual/mh-z19c.pdf): family 0x86 read request/response and checksum, consistent with the preserved BRIXEL MH-Z19 implementation. Applying this family protocol to D remains a compatibility inference until a physical D reply is captured. No undocumented temperature/status or calibration commands are exposed.
- [Plantower PMS3003 V2.3, manufacturer-authored copy](https://download.kamami.pl/p563980-PMS3003%20series%20data%20manual_English_V2.5.pdf): 24-byte frame, atmospheric mass fields, additive checksum.
- [Plantower PMS7003 V2.5, manufacturer-authored copy](https://www.imiconsystem.com/wp-content/uploads/2020/10/p564008-PMS7003-series-data-manua_English_V2.5.pdf): 32-byte frame, active mode, 30s stabilization.
- [Analog Devices MAX30102](https://www.analog.com/media/en/technical-documentation/data-sheets/max30102.pdf): 18-bit red/IR FIFO, 100SPS / 411µs settings, overflow/status bits.
- [Analog Devices MAX30105](https://www.analog.com/media/en/technical-documentation/data-sheets/MAX30105.pdf): reviewed earlier for the shared red/IR mode. On 2026-10-08 the user corrected the owned I2C_013 module to MAX30102; current labels, examples and physical verification target MAX30102. The upstream SparkFun file name remains MAX30105.cpp.
- [AMS CCS811 datasheet, manufacturer-authored copy](https://cdn.sparkfun.com/assets/learn_tutorials/1/4/3/CCS811_Datasheet-DS000459.pdf): 20-minute conditioning; first-use burn-in is separate and firmware-dependent.
- [TI ADS1115](https://www.ti.com/lit/ds/symlink/ads1115.pdf): ±6.144V PGA does not permit exceeding the ADC supply; 5V signal path needs appropriate ADC supply and I2C level shifting.
- [Aosong AZDM01 V1.1, manufacturer-authored copy](https://xonstorage.blob.core.windows.net/pdf/aosong_azdm01_apr22_xonlink.pdf): turbidity factor is the ratio of measured to clear-water voltage. Module current/PWM drive is not established, so no NTU conversion is claimed.
- [Analog Devices DS1307](https://www.analog.com/media/en/technical-documentation/data-sheets/DS1307.pdf): BCD registers, CH flag, 12/24h interpretation.

Adaptation licenses are distributed in THIRD_PARTY_NOTICES.md. Snapshot files are excluded from the extension package; this provenance file and the license notices are included.

## 0.4.0 additions (2026-10-08)

- `fingerprint.ts`: original TypeScript EF01 packet parser and two-stage enrollment state machine. Command numbers, ACK fields, capacity and checksum were cross-checked against the preserved BRIXEL AS608 section and [Adafruit's fingerprint protocol implementation](https://github.com/adafruit/Adafruit-Fingerprint-Sensor-Library/blob/bdbd9dfe2525a40006d8c67e1ecdaa6eea8697f1/Adafruit_Fingerprint.cpp). No image/template upload or deletion commands are exposed. Compatibility with the owned AS608 still needs a captured hardware reply.
- `gps.ts`: original bounded NMEA RMC/GGA parser with checksums, coordinate/field checks and per-field expiration. [Waveshare UART GPS protocol reference](https://www.waveshare.com/wiki/UART_GPS_NEO-6M_%28B%29) was used to cross-check sentence/checksum conventions, not to identify the D_031 module's chipset. No receiver-specific configuration commands are sent.
- `analog-dust.ts`, `native.cpp`: original direct ADC sampling adapter using [Sharp GP2Y1010AU0F timing requirements](https://global.sharp/products/device/lineup/data/pdf/datasheet/gp2y1010au_e.pdf) and [Sharp application circuit notes](https://global.sharp/products/device/lineup/data/pdf/datasheet/gp2y1010au_appl_e.pdf). The exact A_018 model and A_016 adapter circuit remain unconfirmed. Only raw ADC values are provided.
- ADC suspension/restoration was checked against [CODAL NRF52ADC](https://github.com/lancaster-university/codal-nrf52/blob/1fbb7240290fe36a55c61378f5cdeb7640f3ec4a/source/NRF52ADC.cpp) and [NRF52Pin](https://github.com/lancaster-university/codal-nrf52/blob/1fbb7240290fe36a55c61378f5cdeb7640f3ec4a/source/NRF52Pin.cpp). Active ADC stream consumers are rejected. BLE interrupts remain enabled; delayed LED/sample windows return failure. Oscilloscope and coexistence testing remain outstanding.

UART now supports 9600/19200/38400/57600/115200 baud for GPS/fingerprint. PMS/CO2 retain 9600. Only one UART sensor is active at a time; USB remains on its original UART. Inventory assets, protocol research downloads and local test tools are excluded from public distribution.
