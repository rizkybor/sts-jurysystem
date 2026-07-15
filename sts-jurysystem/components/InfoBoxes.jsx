"use client";
import { useState, useEffect } from "react";
import { signIn, useSession, getProviders } from "next-auth/react";
import InfoBox from "./InfoBox";

const InfoBoxes = () => {
  const { data: session } = useSession();
  const [providers, setProviders] = useState(null);

  useEffect(() => {
    const setAuthProviders = async () => {
      const res = await getProviders();
      setProviders(res);
    };
    setAuthProviders();
  }, []);

  const handleJudgesClick = () => {
    if (!session) {
      if (providers) {
        const googleProvider = Object.values(providers)[0];
        signIn(googleProvider.id);
      }
    } else {
      window.location.href = "/judges";
    }
  };

  return (
    <section className="bg-gradient-to-b from-white to-gray-50 py-14 sm:py-16">
      <div className="container-xl lg:container m-auto px-4">
        <div className="text-center mb-8 sm:mb-10">
          <span className="text-xs font-semibold uppercase tracking-wider text-sts">
            Get Started
          </span>
          <h2 className="mt-1 text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Everything you need in one place
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* All Events */}
          <InfoBox
            heading="All Events by Sustainable"
            backgroundColor="bg-white"
            buttonInfo={{
              text: "All Events",
              link: "/matches",
              backgroundColor: "surface-sts",
            }}
          >
            Find all match results from sustainable timings.
          </InfoBox>

          {/* Judges Profile / Jury Register */}
          <InfoBox
            heading={session ? "Judges Profile" : "Judges Register"}
            backgroundColor="bg-white"
            buttonInfo={
              session
                ? [
                    {
                      text: "Judges Task",
                      onClick: handleJudgesClick,
                      backgroundColor: "surface-sts",
                      variant: "solid", 
                      size: "md",
                    },
                    {
                      text: "My Profile",
                      link: "/profile",
                      variant: "ghost",
                      size: "md",
                      className: "text-gray-700 hover:bg-gray-200/60",
                    },
                  ]
                : {
                    text: "Login or Register",
                    onClick: handleJudgesClick,
                    backgroundColor: "surface-sts",
                    variant: "solid",
                  }
            }
          >
            {session ? (
              <div className="flex items-start gap-3">
                {/* Avatar */}
                {session.user?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={session.user.image}
                    alt={session.user.name || "User"}
                    className="h-10 w-10 rounded-full ring-1 ring-gray-200 object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gray-200 ring-1 ring-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600">
                    {(session.user?.name || "U").slice(0, 1).toUpperCase()}
                  </div>
                )}

                {/* Info pengguna */}
                <div>
                  <p className="text-sm text-gray-700">
                    Welcome,&nbsp;
                    <span className="font-semibold text-stsDark">
                      {session.user?.name || "User"}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">{session.user?.email}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    You are logged in. Continue to the Judges Page or view your profile.
                  </p>
                </div>
              </div>
            ) : (
              "Register as a judges in an activity."
            )}
          </InfoBox>
        </div>
      </div>
    </section>
  );
};

export default InfoBoxes;