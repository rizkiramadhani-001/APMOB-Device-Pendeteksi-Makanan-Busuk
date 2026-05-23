import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../utils/supabaseClient';
import { parseDataString } from '../utils/sensorUtils';
import { executeNativePush } from '../utils/notifications';

const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";
const WIFI_CHARACTERISTIC_UUID = "d1a9a1f2-7b68-4c13-9c3e-1f3a5e7d9b24";
const WIFI_STATUS_CHARACTERISTIC_UUID = "e2b0b2f3-8c79-4d24-ad4f-2a4b6f8e0c35";

export function useBluetooth(userId) {
  const [devices, setDevices] = useState([]);
  const [isLoadingDB, setIsLoadingDB] = useState(true);
  const deviceRefs = useRef(new Map());
  const nativePushTimes = useRef(new Map());

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // 1. Fetch Saved Devices on Mount (filtered by userId)
  useEffect(() => {
    if (!userId) {
      setIsLoadingDB(false);
      return;
    }

    const fetchSavedDevices = async () => {
      let loaded = [];
      if (supabase) {
        const { data, error } = await supabase
          .from('registered_devices')
          .select('*')
          .eq('user_id', userId);
        if (error) {
          console.error("Error fetching registered devices from Supabase:", error);
          if (error.code === '42P01' || error.code === 'PGRST205') {
            toast.error("Database table 'registered_devices' is missing! Please execute the Supabase SQL migration.", { id: 'db-migration-warning', duration: 10000 });
          } else {
            toast.error(`Error loading devices: ${error.message}`, { id: 'db-load-error' });
          }
        } else if (data) {
          loaded = data.map(d => ({ id: d.device_id, name: d.name }));
        }
      }

      if (loaded.length > 0) {
        const devicesWithData = await Promise.all(loaded.map(async (d) => {
          let history = [];
          let sensorData = { mq4: '--', mq135: '--', humidity: '--' };
          let status = "Offline";

          if (supabase) {
            // Fetch last 25 readings for this device
            const { data: histData, error: histError } = await supabase
              .from('sensor_history')
              .select('*')
              .eq('device_id', d.id)
              .order('created_at', { ascending: false })
              .limit(25);

            if (!histError && histData && histData.length > 0) {
              // Since we retrieved ascending: false to get the latest, we reverse it to display chronological order in the chart
              const sortedData = [...histData].reverse();
              
              history = sortedData.map(h => ({
                time: h.created_at
                  ? new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                mq4: h.gas,
                mq135: h.temperature,
                humidity: h.humidity
              }));

              const latest = histData[0]; // first item is the most recent due to descending order
              sensorData = {
                mq4: latest.gas.toString(),
                mq135: latest.temperature.toString(),
                humidity: latest.humidity.toString()
              };

              // If the latest reading was within the last 2 minutes, set status to WiFi Active
              const latestTime = new Date(latest.created_at).getTime();
              const now = new Date().getTime();
              if (now - latestTime < 120000) {
                status = "WiFi Active";
              }
            }
          }

          return {
            id: d.id,
            name: d.name,
            status,
            isConnected: false,
            readValue: sensorData.mq4 !== '--' ? `${sensorData.mq4},${sensorData.mq135},${sensorData.humidity}` : "--",
            sensorData,
            history,
            isReading: false
          };
        }));

        setDevices(devicesWithData);
      } else {
        setDevices([]);
      }
      setIsLoadingDB(false);
    };
    fetchSavedDevices();
  }, [userId]);

  // 1.5 Supabase Realtime Subscription for WiFi data
  useEffect(() => {
    if (!supabase || !userId || devices.length === 0) return;

    // Subscribing to postgres insert changes on sensor_history table
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sensor_history'
        },
        (payload) => {
          const newRecord = payload.new;
          const { device_id, gas, temperature, humidity, created_at } = newRecord;

          // Only process updates for devices in our state
          const deviceExists = devices.find(d => d.id === device_id);
          if (!deviceExists) return;

          // If currently connected via BLE, ignore WiFi inserts to avoid duplicate streams
          if (deviceExists.isConnected) return;

          const time = created_at
            ? new Date(created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

          const parsedSensorData = {
            mq4: gas.toString(),
            mq135: temperature.toString(),
            humidity: humidity.toString()
          };

          updateDevice(device_id, (d) => {
            const newPoint = {
              time,
              mq4: gas,
              mq135: temperature,
              humidity
            };
            return {
              status: "WiFi Active",
              sensorData: parsedSensorData,
              history: [...(d.history || []), newPoint].slice(-25)
            };
          });

          checkAlertsAndHistory(device_id, deviceExists.name, parsedSensorData, false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, devices]);

  const updateDevice = (id, updates) => {
    setDevices(prev => prev.map(d => {
      if (d.id === id) {
        const newUpdates = typeof updates === 'function' ? updates(d) : updates;
        return { ...d, ...newUpdates };
      }
      return d;
    }));
  };

  const saveDeviceToDB = async (deviceId, deviceName) => {
    if (supabase && userId) {
      const { error } = await supabase
        .from('registered_devices')
        .upsert([{ device_id: deviceId, name: deviceName, user_id: userId }]);
      if (error) {
        console.error("Error saving device to Supabase:", error);
        toast.error(`Gagal menyimpan perangkat ke database: ${error.message}`, { id: `db-save-err-${deviceId}` });
      }
    }
  };

  const removeDeviceFromDB = async (deviceId) => {
    if (supabase && userId) {
      const { error } = await supabase
        .from('registered_devices')
        .delete()
        .eq('device_id', deviceId)
        .eq('user_id', userId);
      if (error) {
        console.error("Error deleting device from Supabase:", error);
        toast.error(`Gagal menghapus perangkat dari database: ${error.message}`, { id: `db-del-err-${deviceId}` });
      }
    }
  };

  const checkAlertsAndHistory = (deviceId, deviceName, parsedData, shouldInsertToDB = true) => {
    const mq4Val = parseFloat(parsedData.mq4);
    const mq135Val = parseFloat(parsedData.mq135);
    const humVal = parseFloat(parsedData.humidity);

    if (!isNaN(mq4Val) && mq4Val >= 700) {
      toast.error(`High Methane Warning: ${mq4Val} PPM on ${deviceName}!`, { id: `mq4-${deviceId}`, duration: 5000 });
      executeNativePush(`mq4-${deviceId}`, '⚠️ Critical Methane Detected', `${mq4Val} PPM detected! Food may be spoiled.`, nativePushTimes);
    }
    if (!isNaN(mq135Val) && mq135Val >= 800) {
      toast.error(`Poor Air Quality Alert: ${mq135Val} PPM on ${deviceName}!`, { id: `mq135-${deviceId}`, duration: 5000 });
      executeNativePush(`mq135-${deviceId}`, '⚠️ Poor Air Quality', `Ammonia/Sulfide density is ${mq135Val} PPM, indicating spoilage.`, nativePushTimes);
    }

    if (shouldInsertToDB && supabase && !isNaN(mq4Val) && !isNaN(mq135Val) && !isNaN(humVal)) {
      supabase.from('sensor_history')
        .insert([{ device_id: deviceId, gas: mq4Val, humidity: humVal, temperature: mq135Val, user_id: userId }])
        .then(({ error }) => {
          if (error) {
            console.error("Failed to insert sensor data to database:", error);
          }
        });
    }
  };

  // 2. Setup Device Connection Logic
  const setupDeviceConnection = async (device, deviceId, deviceName) => {
    deviceRefs.current.set(deviceId, { device, characteristic: null, wifiCharacteristic: null });

    device.addEventListener('gattserverdisconnected', () => {
      updateDevice(deviceId, {
        status: "Offline",
        isConnected: false,
        readValue: "--",
        sensorData: { mq4: '--', mq135: '--', humidity: '--' }
      });
      const refs = deviceRefs.current.get(deviceId);
      if (refs) refs.characteristic = null;
      toast('Device disconnected.', { icon: '⚠️', id: `disc-${deviceId}` });
      executeNativePush(`disc-${deviceId}`, 'Sensor Disconnected', `${deviceName} lost connection.`, nativePushTimes);
    });

    const server = await device.gatt.connect();
    updateDevice(deviceId, { status: "Getting Service..." });

    const service = await server.getPrimaryService(SERVICE_UUID);
    updateDevice(deviceId, { status: "Getting Characteristic..." });

    const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
    deviceRefs.current.get(deviceId).characteristic = characteristic;

    updateDevice(deviceId, { status: "Connected", isConnected: true });
    toast.success(`Successfully connected to ${deviceName}`, { id: `success-${deviceId}` });
    
    // Save to DB on successful connect
    saveDeviceToDB(deviceId, deviceName);

    // Discover WiFi characteristics
    try {
      const wifiChar = await service.getCharacteristic(WIFI_CHARACTERISTIC_UUID);
      deviceRefs.current.get(deviceId).wifiCharacteristic = wifiChar;

      const wifiStatusChar = await service.getCharacteristic(WIFI_STATUS_CHARACTERISTIC_UUID);
      await wifiStatusChar.startNotifications();
      wifiStatusChar.addEventListener('characteristicvaluechanged', (event) => {
        const statusStr = new TextDecoder('utf-8').decode(event.target.value);
        // Parse: "CONNECTED:192.168.1.x:MySSID" or "DISCONNECTED:MySSID" or "CONNECTING" or "NOT_CONFIGURED"
        const parts = statusStr.split(':');
        const wifiState = parts[0];
        let wifiInfo = { status: wifiState, ip: '', ssid: '' };
        if (wifiState === 'CONNECTED') {
          wifiInfo.ip = parts[1] || '';
          wifiInfo.ssid = parts[2] || '';
        } else if (wifiState === 'DISCONNECTED') {
          wifiInfo.ssid = parts[1] || '';
        }
        updateDevice(deviceId, { wifiStatus: wifiInfo });
      });

      // Read initial status
      const initialVal = await wifiStatusChar.readValue();
      const initialStr = new TextDecoder('utf-8').decode(initialVal);
      if (initialStr) {
        const parts = initialStr.split(':');
        const wifiState = parts[0];
        let wifiInfo = { status: wifiState, ip: '', ssid: '' };
        if (wifiState === 'CONNECTED') {
          wifiInfo.ip = parts[1] || '';
          wifiInfo.ssid = parts[2] || '';
        } else if (wifiState === 'DISCONNECTED') {
          wifiInfo.ssid = parts[1] || '';
        }
        updateDevice(deviceId, { wifiStatus: wifiInfo });
      }
    } catch (e) {
      console.warn("WiFi characteristics not available on this device", e);
    }

    try {
      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', (event) => {
        const dataView = event.target.value;
        const decoder = new TextDecoder('utf-8');
        const decoded = decoder.decode(dataView);

        const parsedSensorData = parseDataString(decoded);

        updateDevice(deviceId, (d) => {
          const newPoint = {
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            mq4: !isNaN(parseFloat(parsedSensorData.mq4)) ? parseFloat(parsedSensorData.mq4) : 0,
            mq135: !isNaN(parseFloat(parsedSensorData.mq135)) ? parseFloat(parsedSensorData.mq135) : 0,
            humidity: !isNaN(parseFloat(parsedSensorData.humidity)) ? parseFloat(parsedSensorData.humidity) : 0,
          };
          return {
            readValue: decoded,
            sensorData: parsedSensorData,
            history: [...(d.history || []), newPoint].slice(-25)
          };
        });

        checkAlertsAndHistory(deviceId, deviceName, parsedSensorData);
      });
      updateDevice(deviceId, { status: "Live Monitoring Active" });
    } catch (e) {
      console.warn("Notifications not supported, fallback to manual");
    }
  };

  const connectToNewDevice = async () => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ name: 'ESP32_GATT_Server' }],
        optionalServices: [SERVICE_UUID]
      });

      const deviceId = device.id;
      const deviceName = device.name || "Unknown ESP32";

      setDevices(prev => {
        const filtered = prev.filter(d => d.id !== deviceId);
        return [...filtered, {
          id: deviceId,
          name: deviceName,
          status: "Connecting...",
          isConnected: false,
          readValue: "--",
          sensorData: { mq4: '--', mq135: '--', humidity: '--' },
          history: [],
          isReading: false
        }];
      });

      await setupDeviceConnection(device, deviceId, deviceName);
    } catch (error) {
      console.error("Connection failed!", error);
    }
  };

  const connectToSavedDevice = async (deviceId, deviceName) => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    updateDevice(deviceId, { status: "Connecting..." });
    try {
      let device = null;
      if (navigator.bluetooth.getDevices) {
        const pairedDevices = await navigator.bluetooth.getDevices();
        device = pairedDevices.find(d => d.id === deviceId);
      }
      if (!device) {
        device = await navigator.bluetooth.requestDevice({
          filters: [{ name: deviceName }],
          optionalServices: [SERVICE_UUID]
        });
      }
      await setupDeviceConnection(device, device.id, device.name || deviceName);
    } catch (error) {
      console.error("Reconnection failed!", error);
      updateDevice(deviceId, { status: "Offline" });
    }
  };

  const disconnectDevice = (deviceId) => {
    const refs = deviceRefs.current.get(deviceId);
    if (refs && refs.device.gatt.connected) refs.device.gatt.disconnect();
  };

  const removeDeviceUi = (deviceId) => {
    disconnectDevice(deviceId);
    setDevices(prev => prev.filter(d => d.id !== deviceId));
    removeDeviceFromDB(deviceId);
  };

  const renameDevice = (deviceId, newName) => {
    updateDevice(deviceId, { name: newName });
    saveDeviceToDB(deviceId, newName);
  };

  const sendWifiCredentials = async (deviceId, ssid, password) => {
    const refs = deviceRefs.current.get(deviceId);
    if (!refs || !refs.wifiCharacteristic) {
      toast.error('WiFi configuration not supported on this device.', { id: `wifi-err-${deviceId}` });
      return false;
    }
    try {
      const encoder = new TextEncoder();
      // Format payload: "SSID:PASSWORD:USER_ID:DEVICE_ID"
      const data = encoder.encode(`${ssid}:${password}:${userId}:${deviceId}`);
      await refs.wifiCharacteristic.writeValue(data);
      toast.success(`WiFi credentials sent to ${ssid}!`, { id: `wifi-${deviceId}` });
      updateDevice(deviceId, { wifiStatus: { status: 'CONNECTING', ip: '', ssid } });
      return true;
    } catch (e) {
      console.error('Failed to send WiFi credentials', e);
      toast.error('Failed to send WiFi credentials.', { id: `wifi-err-${deviceId}` });
      return false;
    }
  };

  return {
    devices,
    isLoadingDB,
    connectToNewDevice,
    connectToSavedDevice,
    disconnectDevice,
    removeDeviceUi,
    renameDevice,
    sendWifiCredentials
  };
}
