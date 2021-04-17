"use strict";

const inherits = require('util').inherits;
const inspect  = require('util').inspect;

var Service, Characteristic;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;





  /**
   * Characteristic "Delay Time Remaining"
   */
  Characteristic.DelayTimeRemaining = function() {
    Characteristic.call(this, 'Delay Time Remaining', '1000006D-0000-1000-8000-0026BB765291');
    this.setProps({
      format: Characteristic.Formats.UINT64,
      unit: Characteristic.Units.SECONDS,
      maxValue: 3600,
      minValue: 0,
      minStep: 1,
      perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
  };
  inherits(Characteristic.DelayTimeRemaining, Characteristic);
  Characteristic.DelayTimeRemaining.UUID = '1000006D-0000-1000-8000-0026BB765291';


  /**
   * Characteristic "Delay Time in Seconds"
   */
  Characteristic.DelayTime = function() {
    Characteristic.call(this, 'Delay Time', '1100006D-0000-1000-8000-0026BB765291');
    this.setProps({
      format: Characteristic.Formats.UINT64,
      unit: Characteristic.Units.SECONDS,
      maxValue: 3600,
      minValue: 0,
      minStep: 1,
      perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
  };
  inherits(Characteristic.DelayTime, Characteristic);
  Characteristic.DelayTime.UUID = '1100006D-0000-1000-8000-0026BB765291';

  homebridge.registerAccessory("@djelibeybi/homebridge-delayed-occupancy", "delayed-occupancy-sensor", DelayedOccupancy);
};



/**
 * This accessory publishes an Occupancy Sensor as well as 1 or more activation
 * switches to control the status of the sensor. If any of the slaves are on
 * then this sensor registers as "Occupancy Detected" ("Occupied). When all
 * slaves are turned off this will remain "Occupied" for as long as the
 * specified delay.
 *
 * Config:
 *
 * name: The name of this Occupancy Sensor and it's activation switches. If there are
 *      more than one slaves they will become "name 1", "name 2", etc.
 * switchCount (optional): Will create 1 activation switch with the same name as the
 *      Occupancy Sensor by default. Change this if you need more than 1 switch
 *      to control the sensor.
 * delay: If set to less than 1 there will be no delay when all switches are
 *      turned to off. Specify a number in seconds and the sensor will wait
 *      that long after all switches have been turned off to become
 *      "Un-occupied". If any activation switch is turned on the counter will clear
 *      and start over once all switches are off again.
 *
 *
 * What can I do with this plugin?
 * @todo: Addd use case and instructions here.
 */
class DelayedOccupancy {
  constructor(log, config) {
    this.log = log;
    this.name = config.name || "Delayed Occupancy Sensor";
      this.switches = config.switches || [];
    this.delay = Math.min(3600, Math.max(0, parseInt(config.delay, 10) || 0));


    this._timer = null;
    this._timer_started = null;
    this._timer_delay = 0;
    this._interval = null;
    this._interval_last_value = 0;
    this._last_occupied_state = false;

    this.switchServices = [];
    this.occupancyService = new Service.OccupancySensor(this.name);

    this.occupancyService.addCharacteristic(Characteristic.DelayTime);
    this.occupancyService.setCharacteristic(Characteristic.DelayTime, this.delay);
    this.occupancyService.getCharacteristic(Characteristic.DelayTime).on('change', (event) => {
      this.log('Setting delay to:', event.newValue);
      this.delay = event.newValue;
    });

    this.occupancyService.addCharacteristic(Characteristic.DelayTimeRemaining);
    this.occupancyService.setCharacteristic(Characteristic.DelayTimeRemaining, 0);

    if (this.switches.length === 0) {
      this.switchCount = 1;
      this.switchServices.push(this._createSwitch('Occupancy Delay Activation Switch'));
    } else {
      this.switchCount = this.switches.length;
      for (const activationSwitch of this.switches) {
        this.switchServices.push(this._createSwitch(activationSwitch));
      }
    }

  }

  /**
   * Starts the countdown timer.
   */
  start() {
    this.stop();
    this._timer_started = (new Date()).getTime();
    if (this.delay) {
      this._timer = setTimeout(this.setOccupancyNotDetected.bind(this), (this.delay * 1000));
      this._timer_delay = this.delay;
      this._interval = setInterval(() => {
        var elapsed = ((new Date()).getTime() - this._timer_started) / 1000,
            newValue = Math.round(this._timer_delay - elapsed);

        if (newValue !== this._interval_last_value) {
          this.occupancyService.setCharacteristic(Characteristic.DelayTimeRemaining, newValue);
          this._interval_last_value = newValue;
        }
      }, 250);
    } else {
      /* occupancy no longer detected */
      this.setOccupancyNotDetected();
    }
  };

  /**
   * Stops the delay countdown timer
   */
  stop() {
    if (this._timer) {
      clearTimeout(this._timer);
      clearInterval(this._interval);
      this._timer = null;
      this._timer_started = null;
      this._timer_delay = null;
      this._interval = null;
    }
  };


  setOccupancyDetected() {
    this._last_occupied_state = true;
    this.log('Sensor is now detecting occupancy.');
    this.occupancyService.setCharacteristic(Characteristic.OccupancyDetected, Characteristic.OccupancyDetected.OCCUPANCY_DETECTED);
    if (this.delay) {
      this.occupancyService.setCharacteristic(Characteristic.DelayTimeRemaining, this.delay);
    }
  }

  setOccupancyNotDetected() {
    this._last_occupied_state = false;
    this.stop();
    this.log('Sensor is no longer detecting occupancy.');
    this.occupancyService.setCharacteristic(Characteristic.OccupancyDetected, Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED);
    if (this.delay) {
      this.occupancyService.setCharacteristic(Characteristic.DelayTimeRemaining, 0);
    }
  }

  /**
   * Checks all the activation switches to see if any of them are on. If so this
   * Occupancy Sensor will remain "Occupied". This is used as a callback when
   * the "On" state changes on any of the activation switches.
   */
  checkOccupancy() {
    var occupied = 0,
        remaining = this.switchCount,

        /* callback for when all the switches values have been returend */
        return_occupancy = (occupied) => {
          if (occupied) {
            if (this._last_occupied_state === !!occupied) {
              this.stop();
            } else {
              this.setOccupancyDetected();
            }
          } else if (null === this._timer) {
            this.start();
          }

        },

        /*
          callback when we check a switches value. keeps track of the switches
          returned value and decides when to finish the function
        */
        set_value = (value) => {
          remaining -= 1;
          if (value) {
            occupied += 1;
          }

          if (!remaining) {
            return_occupancy(occupied);
          }
        };


    /* look at all the activation switches "on" characteristic and return to callback */
    for (let i = 0; i < this.switchCount; i += 1) {
      this.switchServices[i]
          .getCharacteristic(Characteristic.On)
          .getValue(function(err, value) {
            if (!err) {
              set_value(value);
            }
          });
    }
  }

  /**
   * Homebridge function to return all the Services associated with this
   * Accessory.
   *
   * @returns {*[]}
   */
  getServices() {
    var informationService = new Service.AccessoryInformation()
        .setCharacteristic(Characteristic.Manufacturer, 'Djelibeybi')
        .setCharacteristic(Characteristic.Model, 'Delayed Occupancy Sensor')
        .setCharacteristic(Characteristic.FirmwareRevision, '2.0');

    return [this.occupancyService, informationService, ...this.switchServices]
  }

  /**
   * Internal helper function to create a virtual switch that is tied to the
   * status of this Occupancy Sensor.
   *
   * @param name
   * @returns {Service.Switch|*}
   * @private
   */
  _createSwitch(displayName) {
    var sw;

    sw = new Service.Switch(displayName, displayName);
    sw.setCharacteristic(Characteristic.On, false);
    sw.getCharacteristic(Characteristic.On).on('change', this.checkOccupancy.bind(this));

    sw.getCharacteristic(Characteristic.On).onSet(async (value) => {
      var state;
      this.log('%s turned %s', displayName, state = value ? 'on' : 'off');
    });

    this.log('Created occupancy activation switch: ' + displayName);

    return sw;
  }

}
