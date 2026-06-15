'use client'

import { useEffect, useState } from 'react'
import { getOfflineCourses, saveOfflineCourse, deleteOfflineCourse } from '@/lib/db/indexeddb'
import type { Course } from '@/types'

export function useOfflineCourses() {
  const [offlineCourses, setOfflineCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const courses = await getOfflineCourses()
    setOfflineCourses(courses)
    setLoading(false)
  }

  async function saveForOffline(course: Course) {
    await saveOfflineCourse(course)
    await load()
  }

  async function removeOffline(id: string) {
    await deleteOfflineCourse(id)
    await load()
  }

  return { offlineCourses, loading, saveForOffline, removeOffline }
}
