import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ltydxeuqiwqxmvhjinhr.supabase.co'
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0eWR4ZXVxaXdxeG12aGppbmhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTQ0NzgsImV4cCI6MjA4ODk5MDQ3OH0._0JQJc5MzhtvIzArdMpe3SLvZ9lJfAug4dOjSmQ2-8U'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
