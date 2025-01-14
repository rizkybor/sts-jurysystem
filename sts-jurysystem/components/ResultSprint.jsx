"use client";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";

const ResultSprint = ({ isOpen, closeModal, resultData }) => {
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
            <Dialog.Panel className="w-full max-w-lg bg-white p-6 rounded-2xl shadow-xl">
              <Dialog.Title
                as="h3"
                className="text-xl font-semibold text-gray-800 text-center mb-4"
              >
                🏁 Sprint Result
              </Dialog.Title>

              {/* Tabel Data */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="border border-gray-300 px-4 py-2">Position</th>
                      <th className="border border-gray-300 px-4 py-2">Team</th>
                      <th className="border border-gray-300 px-4 py-2">Penalty</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        {resultData?.position}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        {resultData?.team}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        {resultData?.penalty}
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
                  className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition"
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

export default ResultSprint;