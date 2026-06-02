-- Trigger for Customer Notification on Appointment Status Update
CREATE OR REPLACE FUNCTION notify_customer_on_appointment_updated()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
  v_business_name TEXT;
  v_service_name TEXT;
  v_message TEXT;
BEGIN
  -- Only trigger if status changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get business and service details
  SELECT b.name, s.name INTO v_business_name, v_service_name
  FROM businesses b
  JOIN services s ON s.id = NEW.service_id
  WHERE b.id = NEW.business_id;

  v_customer_id := NEW.customer_id;

  IF NEW.status = 'confirmed' THEN
    v_message := 'Your appointment for ' || v_service_name || ' at ' || v_business_name || ' has been confirmed!';
  ELSIF NEW.status = 'cancelled' THEN
    v_message := 'Your appointment for ' || v_service_name || ' at ' || v_business_name || ' was cancelled.';
  ELSIF NEW.status = 'completed' THEN
    v_message := 'Your appointment for ' || v_service_name || ' at ' || v_business_name || ' is marked as completed.';
  END IF;

  IF v_message IS NOT NULL THEN
    PERFORM public.send_push_notification(
      v_customer_id,
      'Appointment Update',
      v_message
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_appointment_updated ON appointments;
CREATE TRIGGER on_appointment_updated
  AFTER UPDATE OF status ON appointments
  FOR EACH ROW EXECUTE FUNCTION notify_customer_on_appointment_updated();
