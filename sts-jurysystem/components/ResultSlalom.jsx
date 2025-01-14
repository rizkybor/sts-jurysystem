"use client";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";

const ResultSlalom = ({ isOpen, closeModal, resultData }) => {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={closeModal}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0 scale-95"
          enterTo="opacity-100 scale-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm flex items-center justify-center">
            <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
              <Dialog.Title
                as="h3"
                className="text-lg font-semibold text-center text-gray-800"
              >
                🌀 Slalom Result
              </Dialog.Title>

              {/* Tabel Hasil */}
              <div className="mt-6">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-300 rounded-lg">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Team</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Penalty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 text-gray-700">{resultData.team}</td>
                      <td className="px-6 py-4 text-gray-700">{resultData.gate}</td>
                      <td className="px-6 py-4 text-gray-700">{resultData.selectedPenalty}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Tabel Detail Penalty */}
              <div className="mt-6">
                <h4 className="text-md font-semibold text-gray-700 mb-2">Penalties Detail</h4>
                <table className="min-w-full divide-y divide-gray-200 border border-gray-300 rounded-lg">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {["P1", "P2", "P3", "P4"].map((pos) => (
                      <tr key={pos}>
                        <td className="px-6 py-4 text-gray-700">{pos}</td>
                        <td
                          className={`px-6 py-4 text-center font-semibold ${
                            resultData.penaltiesDetail[pos] ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          {resultData.penaltiesDetail[pos] ? "⚠️ Hit" : "✅ Clear"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tombol Close */}
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition duration-300"
                >
                  Close
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Transition.Child>
      </Dialog>
    </Transition>
  );
};

export default ResultSlalom;