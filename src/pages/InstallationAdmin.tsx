import React, { useEffect, useState } from 'react';
import { Unit, UNITS } from '../lib/units';
import { listInstallations, upsertInstallation, getUserById } from '../lib/db';
import { Installation } from '../types';

export default function InstallationAdmin() {
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [selectedInstallation, setSelectedInstallation] = useState<Installation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        listInstallations().then(data => {
          const installation = (data as Installation[]).find(i => i.id === user.installationId);
          if (installation) {
            setSelectedInstallation(installation);
          }
        });
      }
    } catch (error) {
      console.error('Failed to load user from localStorage:', error);
    }
  }, []);

  const handleUnitToggle = (unitUic: string) => {
    if (selectedInstallation) {
      const newUnitUics = selectedInstallation.unitUics.includes(unitUic)
        ? selectedInstallation.unitUics.filter(uic => uic !== unitUic)
        : [...selectedInstallation.unitUics, unitUic];
      setSelectedInstallation({ ...selectedInstallation, unitUics: newUnitUics });
    }
  };

  const handleSaveChanges = async () => {
    if (selectedInstallation) {
      const { ok, error } = await upsertInstallation(selectedInstallation);
      if (ok) {
        setFeedback({ type: 'success', message: 'Installation units updated successfully.' });
      } else {
        setFeedback({ type: 'error', message: `Failed to update installation: ${error.message}` });
      }
    }
  };

  const filteredUnits = UNITS.filter(unit =>
    unit.unitName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    unit.ruc.toLowerCase().includes(searchTerm.toLowerCase()) ||
    unit.uic.toLowerCase().includes(searchTerm.toLowerCase()) ||
    unit.mcc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Installation Administration</h2>

      {!selectedInstallation && (
        <div className="text-center text-gray-500">
          <p>You are not assigned to an installation.</p>
        </div>
      )}

      {selectedInstallation && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Managing Units for {selectedInstallation.name}
          </h3>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by name, RUC, UIC, or MCC"
              className="px-4 py-2 border rounded w-full"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 px-3">Assign</th>
                  <th className="py-2 px-3">Unit Name</th>
                  <th className="py-2 px-3">RUC</th>
                  <th className="py-2 px-3">UIC</th>
                  <th className="py-2 px-3">MCC</th>
                  <th className="py-2 px-3">Address</th>
                </tr>
              </thead>
              <tbody>
                {filteredUnits.map(unit => (
                  <tr key={unit.uic} className="border-b">
                    <td className="py-2 px-3">
                      <input
                        type="checkbox"
                        checked={selectedInstallation.unitUics.includes(unit.uic)}
                        onChange={() => handleUnitToggle(unit.uic)}
                      />
                    </td>
                    <td className="py-2 px-3">{unit.unitName}</td>
                    <td className="py-2 px-3">{unit.ruc}</td>
                    <td className="py-2 px-3">{unit.uic}</td>
                    <td className="py-2 px-3">{unit.mcc}</td>
                    <td className="py-2 px-3">{`${unit.streetAddress}, ${unit.cityState} ${unit.zip}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
            onClick={handleSaveChanges}
          >
            Save Changes
          </button>
        </div>
      )}

      {feedback && (
        <div className={`mt-4 p-3 rounded-lg border ${feedback.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {feedback.message}
        </div>
      )}
    </div>
  );
}
