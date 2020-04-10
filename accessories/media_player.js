'use strict';

let Service;
let Characteristic;
let communicationError;

function HomeAssistantMediaPlayer(log, data, client, firmware) {
  /* eslint-disable no-unused-vars */
  const SUPPORT_PAUSE = 1;
  const SUPPORT_SEEK = 2;
  const SUPPORT_VOLUME_SET = 4;
  const SUPPORT_VOLUME_MUTE = 8;
  const SUPPORT_PREVIOUS_TRACK = 16;
  const SUPPORT_NEXT_TRACK = 32;
  const SUPPORT_TURN_ON = 128;
  const SUPPORT_TURN_OFF = 256;
  const SUPPORT_VOLUME_STEP = 1024;
  const SUPPORT_STOP = 4096;
  const SUPPORT_PLAY = 16384;
  /* eslint-enable no-unused-vars */

  // device info
  this.domain = 'media_player';
  this.data = data;
  this.entity_id = data.entity_id;
  this.uuid_base = data.entity_id;
  this.firmware = firmware;
  this.supportedFeatures = data.attributes.supported_features;
  this.stateLogicCompareWithOn = true;

  if (data.attributes && data.attributes.friendly_name) {
    this.name = data.attributes.friendly_name;
  } else {
    this.name = data.entity_id.split('.').pop().replace(/_/g, ' ');
  }

  const supportPause = (this.supportedFeatures | SUPPORT_PAUSE) === this.supportedFeatures;
  const supportStop = (this.supportedFeatures | SUPPORT_STOP) === this.supportedFeatures;
  const supportOnOff = ((this.supportedFeatures | SUPPORT_TURN_ON) === this.supportedFeatures &&
                          (this.supportedFeatures | SUPPORT_TURN_OFF) === this.supportedFeatures);
  this.supportMute = (this.supportedFeatures | SUPPORT_VOLUME_MUTE) === this.supportedFeatures;
  this.supportVolume = (this.supportedFeatures | SUPPORT_VOLUME_SET) === this.supportedFeatures;

  if (this.data && this.data.attributes && this.data.attributes.homebridge_media_player_switch === 'on_off' && supportOnOff) {
    this.onState = 'on';
    this.offState = 'off';
    this.onService = 'turn_on';
    this.offService = 'turn_off';
    this.stateLogicCompareWithOn = false;
  } else if (this.data && this.data.attributes && this.data.attributes.homebridge_media_player_switch === 'play_stop' && supportStop) {
    this.onState = 'playing';
    this.offState = 'idle';
    this.onService = 'media_play';
    this.offService = 'media_stop';
  } else if (supportPause) {
    this.onState = 'playing';
    this.offState = 'paused';
    this.onService = 'media_play';
    this.offService = 'media_pause';
  } else if (supportStop) {
    this.onState = 'playing';
    this.offState = 'idle';
    this.onService = 'media_play';
    this.offService = 'media_stop';
  } else if (supportOnOff) {
    this.onState = 'on';
    this.offState = 'off';
    this.onService = 'turn_on';
    this.offService = 'turn_off';
  }
  if (data.attributes && data.attributes.homebridge_manufacturer) {
    this.manufacturer = String(data.attributes.homebridge_manufacturer);
  } else {
    this.manufacturer = 'Home Assistant';
  }
  if (data.attributes && data.attributes.homebridge_model) {
    this.model = String(data.attributes.homebridge_model);
  } else {
    this.model = 'Media Player';
  }
  if (data.attributes && data.attributes.homebridge_serial) {
    this.serial = String(data.attributes.homebridge_serial);
  } else {
    this.serial = data.entity_id;
  }
  this.client = client;
  this.log = log;
}

HomeAssistantMediaPlayer.prototype = {
  onEvent(oldState, newState) {
    if (newState.state) {
      let powerState;
      if (this.stateLogicCompareWithOn) {
        powerState = newState.state === this.onState;
      } else {
        powerState = newState.state !== this.offState;
      }
      this.switchService.getCharacteristic(Characteristic.On)
        .setValue(powerState, null, 'internal');
    }
  },
  getPowerState(callback) {
    this.log(`fetching power state for: ${this.name}`);

    this.client.fetchState(this.entity_id, (data) => {
      if (data) {
        let powerState;
        if (this.stateLogicCompareWithOn) {
          powerState = data.state === this.onState;
        } else {
          powerState = data.state !== this.offState;
        }
        callback(null, powerState);
      } else {
        callback(communicationError);
      }
    });
  },
  setPowerState(powerOn, callback, context) {
    if (context === 'internal') {
      callback();
      return;
    }

    const that = this;
    const serviceData = {};
    serviceData.entity_id = this.entity_id;

    if (powerOn) {
      this.log(`Setting power state on the '${this.name}' to on`);

      this.client.callService(this.domain, this.onService, serviceData, (data) => {
        if (data) {
          that.log(`Successfully set power state on the '${that.name}' to on`);
          callback();
        } else {
          callback(communicationError);
        }
      });
    } else {
      this.log(`Setting power state on the '${this.name}' to off`);

      this.client.callService(this.domain, this.offService, serviceData, (data) => {
        if (data) {
          that.log(`Successfully set power state on the '${that.name}' to off`);
          callback();
        } else {
          callback(communicationError);
        }
      });
    }
  },
  getMuteState(callback) {
    this.log(`fetching mute state for: ${this.name}`);

    this.client.fetchState(this.entity_id, (data) => {
      if (data) {
        callback(null, data.attributes.is_volume_muted);
      } else {
        callback(communicationError);
      }
    });
  },
  setMuteState(muteOn, callback, context) {
    if (context === 'internal') {
      callback();
      return;
    }

    const that = this;
    const serviceData = {};
    serviceData.entity_id = this.entity_id;
    serviceData.is_volume_muted = (muteOn) ? 'true' : 'false';

    this.log(`Setting mute state on the '${this.name}' to ${serviceData.is_volume_muted}`);

    this.client.callService(this.domain, 'volume_mute', serviceData, (data) => {
      if (data) {
        that.log(`Successfully set mute state on the '${that.name}' to ${serviceData.is_volume_muted}`);
        callback();
      } else {
        callback(communicationError);
      }
    });
  },
  getVolume(callback) {
    this.log(`fetching volume for: ${this.name}`);

    this.client.fetchState(this.entity_id, (data) => {
      if (data) {
        let volume;
        if (!(data.attributes.volume_level)) {
          volume = 0;
        } else {
          volume = (data.attributes.volume_level * 100);
        }
        callback(null, volume);
      } else {
        callback(communicationError);
      }
    });
  },
  setVolume(volume, callback, context) {
    if (context === 'internal') {
      callback();
      return;
    }

    const that = this;
    const serviceData = {};
    serviceData.entity_id = this.entity_id;
    serviceData.volume_level = volume / 100;

    this.log(`Setting volume on the '${this.name}' to ${volume}%`);

    this.client.callService(this.domain, 'volume_set', serviceData, (data) => {
      if (data) {
        that.log(`Successfully set volume on the '${that.name}' to ${serviceData.volume_level}`);
        callback();
      } else {
        callback(communicationError);
      }
    });
  },
  getServices() {
    this.switchService = new Service.Switch();
    const informationService = new Service.AccessoryInformation();

    informationService
      .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
      .setCharacteristic(Characteristic.Model, this.model)
      .setCharacteristic(Characteristic.SerialNumber, this.serial)
      .setCharacteristic(Characteristic.FirmwareRevision, this.firmware);

    this.switchService
      .getCharacteristic(Characteristic.On)
      .on('get', this.getPowerState.bind(this))
      .on('set', this.setPowerState.bind(this));

    if (this.supportMute) {
      this.speakerService = new Service.Speaker();

      this.speakerService
        .setCharacteristic(Characteristic.Name, this.name);

      this.speakerService
        .getCharacteristic(Characteristic.Mute)
        .on('get', this.getMuteState.bind(this))
        .on('set', this.setMuteState.bind(this));

      if (this.supportVolume) {
        this.speakerService
          .getCharacteristic(Characteristic.Volume)
          .on('get', this.getVolume.bind(this))
          .on('set', this.setVolume.bind(this));
      }

      return [informationService, this.switchService, this.speakerService];
    }

    return [informationService, this.switchService];
  },

};

function HomeAssistantMediaPlayerPlatform(oService, oCharacteristic, oCommunicationError) {
  Service = oService;
  Characteristic = oCharacteristic;
  communicationError = oCommunicationError;

  return HomeAssistantMediaPlayer;
}

module.exports = HomeAssistantMediaPlayerPlatform;
module.exports.HomeAssistantMediaPlayer = HomeAssistantMediaPlayer;
