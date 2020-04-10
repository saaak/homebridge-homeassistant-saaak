# [homebridge-homeassistant-saaak](https://www.npmjs.com/package/homebridge-homeassistant-saaak)
对官方版本的homebridge-homeassistant的验证方式做出修改，使其适应新版homeassistant

## 安装方法

```shell
npm install homebridge-homeassistant-saaak -g
```

## 配置方法

```` json
{
        "platform": "HomeAssistant",
        "name": "HomeAssistant",
        "host": "http://127.0.0.1:8123",
	    "password": "Bearer ",
        "supported_types": [
                "binary_sensor",
                "climate",
                "cover",
                "fan",
                "garage_door",
                "device_tracker",
                "input_boolean",
                "light",
                "lock",
                "media_player",
                "rollershutter",
                "sensor",
                "scene",
                "switch"
            ],
            "default_visibility": "visible",
            "verify_ssl": false
}

````

#### tips：

password为

```` 
Bearer+空格+长期访问令牌
````

长期访问令牌获取方法如下：

![1586495247517](https://wx3.sinaimg.cn/mw690/006ocjslgy1gdolgh0yzsj31hc0q1zn0.jpg)
