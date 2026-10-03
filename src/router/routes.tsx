import { createBrowserRouter, Navigate, redirect } from 'react-router'
import LoginPage from '../pages/LoginPage'
import SignupPage from '../pages/SignupPage'
import HomePage from '../pages/HomePage'
import SearchPage from '../pages/SearchPage'
import PowerToolsPage from '../pages/PowerToolsPage'
import GroupSettingsPage from '../pages/GroupSettingsPage'
import NoteEditorPage from '../pages/NoteEditorPage'
import AppsPage from '../pages/AppsPage'
import DiaryPage from '../pages/DiaryPage'
import { installPageTransitions } from '../lib/motion/pageTransitions'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  { path: '/', element: <HomePage /> },
  { path: '/search', element: <SearchPage /> },
  { path: '/settings', element: <PowerToolsPage /> },
  { path: '/settings/groups/:groupId', element: <GroupSettingsPage /> },
  // Power Tools was renamed to Settings in 2.7 — keep old links working.
  { path: '/power-tools', loader: () => redirect('/settings') },
  { path: '/power-tools/groups/:groupId', loader: ({ params }) => redirect(`/settings/groups/${params.groupId}`) },
  { path: '/apps', element: <AppsPage /> },
  { path: '/apps/diary', element: <DiaryPage /> },
  { path: '/notes/new', element: <NoteEditorPage /> },
  { path: '/notes/:id/edit', element: <NoteEditorPage /> },
  { path: '*', element: <Navigate to="/" replace /> },
])

installPageTransitions(router)
