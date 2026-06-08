import { supabase } from './supabase'

// Load the user's most recent board
export async function loadBoard(userId) {
  const { data, error } = await supabase
    .from('boards')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error loading board:', error)
    return null
  }

  return data || null
}

// Save (or create) a board
export async function saveBoard(userId, canvas, boardId = null) {
  if (boardId) {
    // Update existing board
    const { data, error } = await supabase
      .from('boards')
      .update({
        canvas,
        updated_at: new Date().toISOString()
      })
      .eq('id', boardId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error saving board:', error)
      return null
    }
    return data
  } else {
    // Create new board
    const { data, error } = await supabase
      .from('boards')
      .insert({
        user_id: userId,
        canvas,
        title: 'My Board'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating board:', error)
      return null
    }
    return data
  }
}