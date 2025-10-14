'use client'
import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'

const ResultSprint = ({ isOpen, closeModal, sprintResults }) => {
  console.log('📊 Sprint Results Data:', sprintResults)
  if (sprintResults.length > 0) {
    console.log('🔍 First result structure:', sprintResults[0])
    console.log('🔍 All keys in first result:', Object.keys(sprintResults[0]))
  }
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as='div' className='relative z-10' onClose={closeModal}>
        <Transition.Child
          as={Fragment}
          enter='ease-out duration-300'
          enterFrom='opacity-0 scale-95'
          enterTo='opacity-100 scale-100'
          leave='ease-in duration-200'
          leaveFrom='opacity-100 scale-100'
          leaveTo='opacity-0 scale-95'>
          <div className='fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm flex items-center justify-center'>
            <Dialog.Panel className='w-full max-w-2xl bg-white p-6 rounded-2xl shadow-xl'>
              <Dialog.Title
                as='h3'
                className='text-xl font-semibold text-gray-800 text-center mb-4'>
                🏁 Sprint Results
              </Dialog.Title>

              {/* Table */}
              <div className='overflow-x-auto max-h-96 overflow-y-auto'>
                <table className='w-full border-collapse border border-gray-300'>
                  <thead>
                    <tr className='bg-gray-200'>
                      <th className='border border-gray-300 px-4 py-2'>No</th>
                      <th className='border border-gray-300 px-4 py-2'>
                        Team Name
                      </th>
                      <th className='border border-gray-300 px-4 py-2'>BIB</th>
                      <th className='border border-gray-300 px-4 py-2'>
                        Position
                      </th>
                      <th className='border border-gray-300 px-4 py-2'>
                        Penalty
                      </th>
                      <th className='border border-gray-300 px-4 py-2'>
                        Judge
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sprintResults.length > 0 ? (
                      sprintResults.map((result, index) => (
                        <tr
                          key={result._id || index}
                          className='hover:bg-gray-50'>
                          <td className='border border-gray-300 px-4 py-2 text-center'>
                            {index + 1}
                          </td>
                          <td className='border border-gray-300 px-4 py-2'>
                            {result.teamInfo?.nameTeam || `Team ${result.team}`}
                          </td>
                          <td className='border border-gray-300 px-4 py-2 text-center'>
                            {result.teamInfo?.bibTeam || 'N/A'}
                          </td>
                          <td className='border border-gray-300 px-4 py-2 text-center'>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                result.position === 'Start'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-green-100 text-green-800'
                              }`}>
                              {result.position}
                            </span>
                          </td>
                          <td className='border border-gray-300 px-4 py-2 text-center'>
                            <span
                              className={`font-semibold ${
                                result.penalty === 0
                                  ? 'text-green-600'
                                  : result.penalty === 5
                                  ? 'text-yellow-600'
                                  : 'text-red-600'
                              }`}>
                              {result.penalty} points
                            </span>
                          </td>
                          <td className='border border-gray-300 px-4 py-2 text-center text-sm'>
                            {result.judge || 'Unknown'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan='6'
                          className='border border-gray-300 px-4 py-8 text-center text-gray-500'>
                          No sprint results available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Close Button */}
              <div className='mt-6 text-center'>
                <button
                  type='button'
                  className='px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors'
                  onClick={closeModal}>
                  Close
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Transition.Child>
      </Dialog>
    </Transition>
  )
}

export default ResultSprint
