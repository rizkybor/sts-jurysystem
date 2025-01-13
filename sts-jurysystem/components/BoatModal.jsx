"use client";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useState } from "react";

const BoatModal = ({ isOpen, closeModal }) => {
  const [score, setScore] = useState(0);
  const [clickedCircles, setClickedCircles] = useState({
    P1: false,
    P2: false,
    P3: false,
    P4: false,
  });

  const handleClick = (position) => {
    setClickedCircles((prev) => {
      const isClicked = prev[position];
      const updated = { ...prev, [position]: !isClicked };

      // Update skor saat lingkaran diklik
      setScore((prevScore) => (isClicked ? prevScore - 10 : prevScore + 10));

      return updated;
    });
  };

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
            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
              <Dialog.Title
                as="h3"
                className="text-lg font-medium leading-6 text-gray-900 text-center"
              >
                Penalties Detail
              </Dialog.Title>

              {/* Skor Penalties */}
              <div className="text-center text-lg font-semibold mt-2">
                Sample Penalties Point: {score}
              </div>

              {/* Boat Design */}
              <div className="mt-6 flex justify-center">
                <div className="relative w-64 h-96 bg-green-300 rounded-full shadow-inner border-8 border-green-600">
                  <div className="absolute top-4 left-4 w-64 h-88 bg-green-800 rounded-full">
                    
                  </div>

                  {/* Lingkaran P1 */}
                  <div
                    onClick={() => handleClick("P1")}
                    className={`absolute w-14 h-14 flex items-center justify-center rounded-full cursor-pointer font-bold ${
                      clickedCircles["P1"] ? "bg-red-500" : "bg-yellow-300"
                    } hover:scale-105 transition`}
                    style={{ top: "10%", left: "20%" }}
                  >
                    P1
                  </div>

                  {/* Lingkaran P2 */}
                  <div
                    onClick={() => handleClick("P2")}
                    className={`absolute w-14 h-14 flex items-center justify-center rounded-full cursor-pointer font-bold ${
                      clickedCircles["P2"] ? "bg-red-500" : "bg-yellow-300"
                    } hover:scale-105 transition`}
                    style={{ top: "10%", right: "20%" }}
                  >
                    P2
                  </div>

                  {/* Lingkaran P3 */}
                  <div
                    onClick={() => handleClick("P3")}
                    className={`absolute w-14 h-14 flex items-center justify-center rounded-full cursor-pointer font-bold ${
                      clickedCircles["P3"] ? "bg-red-500" : "bg-yellow-300"
                    } hover:scale-105 transition`}
                    style={{ bottom: "10%", left: "20%" }}
                  >
                    P3
                  </div>

                  {/* Lingkaran P4 */}
                  <div
                    onClick={() => handleClick("P4")}
                    className={`absolute w-14 h-14 flex items-center justify-center rounded-full cursor-pointer font-bold ${
                      clickedCircles["P4"] ? "bg-red-500" : "bg-yellow-300"
                    } hover:scale-105 transition`}
                    style={{ bottom: "10%", right: "20%" }}
                  >
                    P4
                  </div>
                </div>
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

export default BoatModal;