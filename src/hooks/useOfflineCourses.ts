'use client';
import { useEffect, useState } from 'react';
import { getCachedCourses, deleteCachedCourse } from '@/lib/db/indexeddb';
import type { Course } from '@/types';

export function useOfflineCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCachedCourses().then((data) => {
      setCourses(data);
      setLoading(false);
    });
  }, []);

  async function removeCourse(id: string) {
    await deleteCachedCourse(id);
    setCourses((prev) => prev.filter((c) => c.id !== id));
  }

  return { courses, loading, removeCourse };
}
