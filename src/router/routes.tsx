import { createBrowserRouter, Navigate } from 'react-router'
import LoginPage from '../pages/LoginPage'
import SignupPage from '../pages/SignupPage'
import HomePage from '../pages/HomePage'
import SearchPage from '../pages/SearchPage'
import PowerToolsPage from '../pages/PowerToolsPage'
import GroupSettingsPage from '../pages/GroupSettingsPage'
import NoteEditorPage from '../pages/NoteEditorPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  { path: '/', element: <HomePage /> },
  { path: '/search', element: <SearchPage /> },
  { path: '/power-tools', element: <PowerToolsPage /> },
  { path: '/power-tools/groups/:groupId', element: <GroupSettingsPage /> },
  { path: '/notes/new', element: <NoteEditorPage /> },
  { path: '/notes/:id/edit', element: <NoteEditorPage /> },
  { path: '*', element: <Navigate to="/" replace /> },
])
