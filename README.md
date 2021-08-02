# Delayed Occupancy Sensor Plugin for Homebridge

This plugin is designed to solve HomeKit's inability to reset the timer that
starts when an accessory is controlled by a motion sensor event.

> **Note:** you must [setup a HomePod, HomePod mini, Apple TV or iPad as a home hub][4]
> before installing this plugin as it relies on automations to function.

## Don't use this plugin: use a better one

This plugin exists to solve a particular problem of mine and I consider it
functionally complete. I don't intend to add any more features.

I recommend using **[`homebridge-magic-occupancy`][1]** instead
as it was forked from the same source but has added a _lot_ more functionality
and is [Homebridge Verified][2].

### Why does this plugin exist?

The code is derived from the original [`homebridge-occupancy-delay`][3] plugin
which I used successfully for many years. My version just modifies logging, configuration and accessory metadata.

### What does this plugin do?

The plugin creates a virtual occupancy sensor with one or more associated
switches. When a switch turns on, the sensor detects occupancy. When all the
switches turn off, the sensor ways for the nominated delay period before it
stops detecting occupancy. If a switch is turned on before the timer ends,
the timer is reset.

### What automations do I need to configure to make this work?

> This example describes a basic scenario to enable motion-sensor activated lights.

1. When your motion sensor detects motion, turn the activation sensor switch _on_.
2. When your motion sensor stops detecting motion, turn the activation sensor _off_.
3. When the occupancy sensor detects occupancy, turn your lights _on_.
4. When the occupancy sensor stops detecting occupancy, turn your lights _off_.

The plugin allows you to create multiple activation switches so that you can
link multiple sensors to the same occupancy sensor. The plugin will wait until
all the switches are off before starting the timer.

### How to install

 The simplest method to install and configure this plugin is via
[`homebridge-config-ui-x`](https://www.npmjs.com/package/homebridge-config-ui-x).
Just search for `@djelibeybi/homebridge-delayed-occupancy` on the Plugins tab.

To install manually, run the following command in your Homebridge directory.
Depending on how you installed Homebridge, you may need to add the `-g` and/or
the `--unsafe-perms` parameters:

```shell
npm install [-g|--unsafe-perms] homebridge-delayed-occupancy
```

The `-g` option will install the plugin globally and the `--unsafe-perms` option
is needed for some platforms to install successfully.

## Configuration

The plugin can be configured via the [`homebridge-config-ui-x`](https://www.npmjs.com/package/homebridge-config-ui-x)
admin interface.

To configure the plugin manually, add one or more configuration stanzas to the
`accessories` block of your Homebridge `config.json` file:

 ```json
    "accessories": [
        {
          "accessory": "delayed-occupancy-sensor",
          "name": "Delayed Occupancy Sensor",
          "delay": 5,
          "switches": [
            "First activation switch",
            "Second activation switch"
          ]
        }
    ]
```

The `switches` list is optional. If you do not include this list, a single
switch will be automatically created by the plugin. If you provide this list,
then the names provided will be used as the name of each switch in HomeKit.

[1]: https://github.com/Jason-Morcos/homebridge-magic-occupancy
[2]: https://github.com/homebridge/homebridge/wiki/Verified-Plugins
[3]: https://github.com/archanglmr/homebridge-occupancy-delay/
[4]: https://support.apple.com/en-us/HT207057
