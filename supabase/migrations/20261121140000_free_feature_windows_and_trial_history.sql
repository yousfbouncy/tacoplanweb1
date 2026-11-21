-- Per-feature free periods persist across global plans disabled/re-enabled.
-- The launch is created ONLY on first publication of a limited feature.
CREATE TABLE IF NOT EXISTS public.tp_free_feature_launches (
 feature_key text PRIMARY KEY CHECK(feature_key IN('auto','diets','manual','notify','reports','trip','widget')),
 first_started_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tp_free_feature_launches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tp_free_feature_launches FROM public,anon,authenticated;

-- Independently retain Stripe free-trial usage even if a subscription is canceled.
CREATE TABLE IF NOT EXISTS public.tp_driver_trial_history (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 first_trial_at timestamptz NOT NULL DEFAULT now(),
 plan text NOT NULL DEFAULT 'plus' CHECK(plan IN('plus','pro','unknown')),
 source text NOT NULL DEFAULT 'stripe',
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tp_driver_trial_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tp_driver_trial_history FROM public,anon,authenticated;

INSERT INTO public.tp_driver_trial_history(user_id,first_trial_at,plan,source)
SELECT user_id,coalesce(trial_ends_at,updated_at,now()),
 CASE WHEN price_slug LIKE 'pro%' THEN 'pro'
      WHEN price_slug LIKE 'plus%' THEN 'plus' ELSE 'unknown' END,
 'legacy_subscription'
FROM public.tp_driver_subscriptions
WHERE trial_used IS TRUE OR status='trialing' OR trial_ends_at IS NOT NULL
ON CONFLICT(user_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.tp_feature_notification_events (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 feature_key text NOT NULL,
 event_key text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 push_status text,
 PRIMARY KEY(user_id,feature_key,event_key)
);
ALTER TABLE public.tp_feature_notification_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tp_feature_notification_events FROM public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.tp_publish_plan_policy(p_slug text,p_version integer)
RETURNS public.tp_plan_policies
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE current_policy public.tp_plan_policies;
 old_published jsonb;
 f text; d text;
BEGIN
 SELECT * INTO current_policy FROM public.tp_plan_policies WHERE slug=p_slug FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Plan no encontrado'; END IF;
 IF current_policy.version<>p_version THEN RAISE EXCEPTION 'El plan ha cambiado: recarga antes de publicar'; END IF;
 old_published:=current_policy.published_config;
 IF p_slug IN ('plus','pro') THEN
  UPDATE public.tp_subscription_price_catalog
  SET trial_days=(current_policy.draft_config->>'trial_days')::integer,updated_at=now()
  WHERE plan=p_slug;
 END IF;
 IF p_slug='free' THEN
  FOR f,d IN SELECT key,value FROM jsonb_each_text(coalesce(current_policy.draft_config->'free_feature_days','{}'::jsonb))
  LOOP
   IF d ~ '^[0-9]+$' AND d::integer>0 THEN
    INSERT INTO public.tp_free_feature_launches(feature_key) VALUES(f)
    ON CONFLICT(feature_key) DO NOTHING;
   END IF;
  END LOOP;
 END IF;
 UPDATE public.tp_plan_policies SET
  published_config=draft_config,published_at=now(),updated_at=now(),version=version+1
 WHERE slug=p_slug RETURNING * INTO current_policy;
 INSERT INTO public.tp_plan_policy_audit(plan_slug,action,before_config,after_config)
 VALUES(p_slug,'publish',old_published,current_policy.published_config);
 RETURN current_policy;
END;
$$;
REVOKE ALL ON FUNCTION public.tp_publish_plan_policy(text,integer) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.tp_publish_plan_policy(text,integer) TO service_role;

-- Newly published plan notices start only after this feature was installed.
-- This avoids sending old policy announcements retroactively.
CREATE TABLE IF NOT EXISTS public.tp_feature_notification_runtime (
 id integer PRIMARY KEY CHECK(id=1),
 activated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tp_feature_notification_runtime ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tp_feature_notification_runtime FROM public,anon,authenticated;
INSERT INTO public.tp_feature_notification_runtime(id) VALUES(1)
ON CONFLICT(id) DO NOTHING;
