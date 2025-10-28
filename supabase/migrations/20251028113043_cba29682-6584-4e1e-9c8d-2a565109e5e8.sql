-- Seed achievements for the gamification system
INSERT INTO public.achievements (name, description, badge_icon, category, points_required) VALUES
-- Reading Achievements
('First Steps', 'Read your first article', '📖', 'reading', 0),
('Knowledge Seeker', 'Read 10 articles', '📚', 'reading', 0),
('Dedicated Reader', 'Read 50 articles', '🎓', 'reading', 0),
('AI Scholar', 'Read 100 articles', '🏆', 'reading', 0),
('AI Pioneer', 'Read 250 articles', '🚀', 'reading', 0),
('News Hound', 'Read articles 5 days in a row', '📰', 'reading', 0),
('Tool Explorer', 'Rate 5 AI tools', '🔧', 'engagement', 0),
-- Streak Achievements
('Week Warrior', 'Maintain a 7-day reading streak', '🔥', 'streak', 0),
('Month Master', 'Maintain a 30-day reading streak', '⚡', 'streak', 0),
('Early Adopter', 'Join during launch week', '🌟', 'special', 0),
-- Comment Achievements
('Conversationalist', 'Post your first comment', '💬', 'social', 0),
('Comment Champion', 'Post 25 comments', '🎤', 'social', 0),
('Conversation Master', 'Post 100 comments', '👑', 'social', 0),
-- Bookmark Achievements
('First Bookmark', 'Save your first bookmark', '🔖', 'engagement', 0),
('Bookmark Collector', 'Save 25 bookmarks', '📌', 'engagement', 0),
-- Sharing Achievements
('Social Sharer', 'Share 10 articles', '📢', 'social', 0),
('Social Butterfly', 'Share 50 articles', '🦋', 'social', 0),
-- Profile Completion Achievements
('Digital Pioneer', 'Complete your profile', '✨', 'profile', 0),
('Profile Master', 'Achieve 45+ signup points', '👤', 'profile', 45),
-- Level Achievements
('Explorer', 'Reach Explorer level', '🧭', 'level', 0),
('Enthusiast', 'Reach Enthusiast level', '💜', 'level', 100),
('Expert', 'Reach Expert level', '🎯', 'level', 500),
('Thought Leader', 'Reach Thought Leader level', '💎', 'level', 1000),
-- Newsletter Achievement
('Newsletter Insider', 'Subscribe to the newsletter', '📧', 'engagement', 0),
-- Regional Achievement
('Asia Expert', 'Read articles from 5+ Asian countries', '🌏', 'reading', 0);