export interface Person {
  id: string;
  name: string;
  relationship: 'Family' | 'Friend' | 'Caregiver' | 'Doctor' | 'Neighbor';
  photo: string; // base64 string
  keyFacts: string;
  recentTopics: string;
  createdAt: string;
}

const STORAGE_KEY = 'memory_assistant_people';

export function getPeople(): Person[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function savePerson(person: Omit<Person, 'id' | 'createdAt'>): Person {
  const people = getPeople();
  const newPerson: Person = {
    ...person,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };
  people.push(newPerson);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(people));
  return newPerson;
}

export function updatePerson(id: string, updates: Partial<Person>): Person | null {
  const people = getPeople();
  const index = people.findIndex(p => p.id === id);
  if (index === -1) return null;
  people[index] = { ...people[index], ...updates };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(people));
  return people[index];
}

export function deletePerson(id: string): boolean {
  const people = getPeople();
  const filtered = people.filter(p => p.id !== id);
  if (filtered.length === people.length) return false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

export function getPersonById(id: string): Person | null {
  const people = getPeople();
  return people.find(p => p.id === id) || null;
}

