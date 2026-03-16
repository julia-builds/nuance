-- Clean up orphaned notifications from deleted users
DELETE FROM public.notifications
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Clean up orphaned activity_log from deleted users
DELETE FROM public.activity_log
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Clean up orphaned review_cards from deleted users
DELETE FROM public.review_cards
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Add CASCADE FK so future deletions automatically clean up
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.activity_log
  DROP CONSTRAINT IF EXISTS activity_log_user_id_fkey;

ALTER TABLE public.activity_log
  ADD CONSTRAINT activity_log_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.review_cards
  DROP CONSTRAINT IF EXISTS review_cards_user_id_fkey;

ALTER TABLE public.review_cards
  ADD CONSTRAINT review_cards_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
