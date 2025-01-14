"use client";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";

const ResultHeadToHead = ({ isOpen, closeModal, resultData }) => {
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
                🤜🤛 Head to Head Result
              </Dialog.Title>

              {/* Tabel Hasil */}
              <div className="mt-6">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-300 rounded-lg">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Heat
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Booyan
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Team A Result
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Team B Result
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 text-gray-700">
                        {resultData.heat}
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {resultData.booyan}
                      </td>
                      <td
                        className={`px-6 py-4 text-center font-semibold ${
                          resultData.teamA === "Y" ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {resultData.teamA === "Y" ? "YES" : "NO"}
                      </td>
                      <td
                        className={`px-6 py-4 text-center font-semibold ${
                          resultData.teamB === "Y" ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {resultData.teamB === "Y" ? "YES" : "NO"}
                      </td>
                    </tr>
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

export default ResultHeadToHead;