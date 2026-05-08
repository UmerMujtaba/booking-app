-- Enable pg_net extension if not enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Helper function to send notification via Edge Function
-- NOTE: Replace YOUR_PROJECT_REF with your actual Supabase project reference
CREATE OR REPLACE FUNCTION public.send_push_notification(
  p_user_id UUID,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_push_token TEXT;
  v_project_ref TEXT := 'nuhlipahtxoxzbicfinw'; -- USER NEEDS TO UPDATE THIS
BEGIN
  -- Get the push token for the user
  SELECT push_token INTO v_push_token FROM profiles WHERE id = p_user_id;

  -- Only send if the user has a push token
  IF v_push_token IS NOT NULL THEN
    PERFORM
      net.http_post(
        url := 'https://' || v_project_ref || '.functions.supabase.co/send-push-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || COALESCE(
            current_setting('request.headers', true)::jsonb->>'authorization',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51aGxpcGFodHhveHpiaWNmaW53Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1MTU1NiwiZXhwIjoyMDkzNjI3NTU2fQ.9zComhCk-o2V0ZFBHDHyHXRxcz79dDm73nf7hzADVOk' -- Fallback if no user session
          )
        ),
        body := jsonb_build_object(
          'to', v_push_token,
          'title', p_title,
          'body', p_body,
          'data', p_data
        )
      );
  END IF;
END;
$$;

-- Trigger for New Business Created (Notify Admins)
CREATE OR REPLACE FUNCTION notify_admin_on_business_created()
RETURNS TRIGGER AS $$
DECLARE
  v_admin_record RECORD;
BEGIN
  FOR v_admin_record IN SELECT id FROM profiles WHERE role = 'admin' LOOP
    PERFORM public.send_push_notification(
      v_admin_record.id,
      'New Business Created',
      'A new business "' || NEW.name || '" has been created and needs approval.'
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_business_created ON businesses;
CREATE TRIGGER on_business_created
  AFTER INSERT ON businesses
  FOR EACH ROW EXECUTE FUNCTION notify_admin_on_business_created();

-- Trigger for New Appointment Created (Notify Owners)
CREATE OR REPLACE FUNCTION notify_owner_on_appointment_created()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id UUID;
  v_business_name TEXT;
BEGIN
  -- Get business owner and name
  SELECT owner_id, name INTO v_owner_id, v_business_name
  FROM businesses
  WHERE id = NEW.business_id;

  PERFORM public.send_push_notification(
    v_owner_id,
    'New Booking!',
    'Someone just booked a service at ' || v_business_name
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_appointment_created ON appointments;
CREATE TRIGGER on_appointment_created
  AFTER INSERT ON appointments
  FOR EACH ROW EXECUTE FUNCTION notify_owner_on_appointment_created();
