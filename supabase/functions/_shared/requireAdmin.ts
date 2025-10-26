/**
 * Reusable auth helper to verify admin role
 * Throws an error if the user is not an admin
 * 
 * @param supabase - Supabase client instance
 * @param userId - User ID to check
 * @throws Error if user is not an admin
 */
export async function requireAdmin(supabase: any, userId: string): Promise<void> {
  const { data: isAdmin } = await supabase.rpc('has_role', {
    _user_id: userId,
    _role: 'admin'
  });
  
  if (!isAdmin) {
    throw new Error('Admin role required');
  }
}

/**
 * Extracts and validates the user from the Authorization header
 * 
 * @param supabase - Supabase client instance
 * @param authHeader - Authorization header value
 * @returns User object if valid, null otherwise
 */
export async function getUserFromAuth(supabase: any, authHeader: string | null) {
  if (!authHeader) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return null;
  }

  return user;
}
