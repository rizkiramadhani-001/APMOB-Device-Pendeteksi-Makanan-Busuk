import toast from 'react-hot-toast';

export async function subscribeToPushNotifications() {
  const pusherInstanceId = '0664ee09-f5b7-4160-ac77-2a400c0f0854';
  
  if (!pusherInstanceId) {
    toast.error('Pusher Instance ID is missing.');
    return false;
  }

  try {
    // Request permission from the browser first
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      toast.error('Notification permission denied');
      return false;
    }

    // Import Pusher Beams dynamically
    const PusherPushNotifications = await import('@pusher/push-notifications-web');
    
    // Initialize Pusher Beams Client
    const beamsClient = new PusherPushNotifications.Client({
      instanceId: pusherInstanceId,
    });

    // Start the client (this automatically registers the service-worker.js)
    await beamsClient.start();
    
    // Subscribe to the specific interest for this app
    await beamsClient.addDeviceInterest('spoiled-food');
    
    toast.success('Successfully subscribed to spoilage alerts via Pusher!');
    return true;
  } catch (error) {
    console.error('Pusher Beams Error:', error);
    toast.error('Failed to subscribe: ' + error.message);
    return false;
  }
}


