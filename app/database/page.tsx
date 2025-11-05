'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { Person, getPeople, savePerson, deletePerson, updatePerson } from '@/lib/storage';

export default function DatabasePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    relationship: 'Family' as Person['relationship'],
    photo: '',
    keyFacts: '',
    recentTopics: '',
  });

  useEffect(() => {
    setPeople(getPeople());
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, photo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPerson) {
      updatePerson(editingPerson.id, formData);
    } else {
      savePerson(formData);
    }
    setPeople(getPeople());
    setShowForm(false);
    setEditingPerson(null);
    setFormData({
      name: '',
      relationship: 'Family',
      photo: '',
      keyFacts: '',
      recentTopics: '',
    });
  };

  const handleEdit = (person: Person) => {
    setEditingPerson(person);
    setFormData({
      name: person.name,
      relationship: person.relationship,
      photo: person.photo,
      keyFacts: person.keyFacts,
      recentTopics: person.recentTopics,
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this person?')) {
      deletePerson(id);
      setPeople(getPeople());
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingPerson(null);
    setFormData({
      name: '',
      relationship: 'Family',
      photo: '',
      keyFacts: '',
      recentTopics: '',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">People Database</h1>
          <button
            onClick={() => setShowForm(true)}
            className="bg-primary-600 text-white px-6 py-3 rounded-lg text-lg font-semibold hover:bg-primary-700 transition-colors"
          >
            + Add Person
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              {editingPerson ? 'Edit Person' : 'Add New Person'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-lg"
                />
              </div>

              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">
                  Relationship
                </label>
                <select
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value as Person['relationship'] })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-lg"
                >
                  <option value="Family">Family</option>
                  <option value="Friend">Friend</option>
                  <option value="Caregiver">Caregiver</option>
                  <option value="Doctor">Doctor</option>
                  <option value="Neighbor">Neighbor</option>
                </select>
              </div>

              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">
                  Upload Photo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-lg"
                />
                {formData.photo && (
                  <img
                    src={formData.photo}
                    alt="Preview"
                    className="mt-2 w-32 h-32 object-cover rounded-lg"
                  />
                )}
              </div>

              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">
                  Key Facts
                </label>
                <textarea
                  value={formData.keyFacts}
                  onChange={(e) => setFormData({ ...formData, keyFacts: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-lg"
                  placeholder="Things to remember about this person..."
                />
              </div>

              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">
                  Recent Topics
                </label>
                <textarea
                  value={formData.recentTopics}
                  onChange={(e) => setFormData({ ...formData, recentTopics: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-lg"
                  placeholder="What you talked about recently..."
                />
              </div>

              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="bg-primary-600 text-white px-6 py-3 rounded-lg text-lg font-semibold hover:bg-primary-700 transition-colors"
                >
                  {editingPerson ? 'Update' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="bg-gray-300 text-gray-700 px-6 py-3 rounded-lg text-lg font-semibold hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {people.map((person) => (
            <div
              key={person.id}
              className="bg-white rounded-lg shadow-md overflow-hidden"
            >
              {person.photo && (
                <div className="w-full h-48 bg-gray-200 relative">
                  <img
                    src={person.photo}
                    alt={person.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-6">
                <h3 className="text-2xl font-semibold text-gray-900 mb-1">
                  {person.name}
                </h3>
                <p className="text-lg text-gray-600 mb-4">{person.relationship}</p>
                {person.keyFacts && (
                  <p className="text-gray-700 mb-2 line-clamp-2">
                    {person.keyFacts}
                  </p>
                )}
                <div className="flex space-x-2 mt-4">
                  <button
                    onClick={() => handleEdit(person)}
                    className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg text-lg font-medium hover:bg-primary-700 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(person.id)}
                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg text-lg font-medium hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {people.length === 0 && !showForm && (
          <div className="text-center py-12">
            <p className="text-xl text-gray-600">
              No people added yet. Click "Add Person" to get started.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

