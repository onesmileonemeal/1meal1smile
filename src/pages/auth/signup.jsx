import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, googleProvider, db } from "/firebaseConfig";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendEmailVerification,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { FcGoogle } from "react-icons/fc";
import {
  HiOutlineMail,
  HiOutlineLockClosed,
  HiOutlineUser,
  HiOutlineInformationCircle,
} from "react-icons/hi";
import { useUser } from "../../../context/UserContext";

const Signup = () => {
  const [userType, setUserType] = useState(null); // "volunteer" or "donor"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [verificationSent, setVerificationSent] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [successMsg, setSuccessMsg] = useState("");
  const navigate = useNavigate();
  const { setUser } = useUser();

  useEffect(() => {
    let interval;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown((count) => count - 1);
      }, 1000);
    } else if (countdown === 0) {
      setResendDisabled(false);
    }

    return () => clearInterval(interval);
  }, [countdown]);

  useEffect(() => {
    if (verificationSent) {
      // Set up an auth state listener to check for email verification
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          // Reload user to get fresh emailVerified status
          user.reload().then(() => {
            if (user.emailVerified) {
              handleVerificationSuccess(user);
            }
          });
        }
      });

      return () => unsubscribe();
    }
  }, [verificationSent]);

  const saveUserToFirestore = async (user) => {
    if (!userType) {
      setError("Please select an account type (Donor or Volunteer)");
      return;
    }

    if (!user.emailVerified) {
      setError("Email must be verified before saving user data");
      return;
    }

    const collectionName = userType === "volunteer" ? "volunteers" : "donors";
    const userRef = doc(db, collectionName, user.uid);

    const userData = {
      uid: user.uid,
      name,
      type: null, // Initially null, updated in complete profile
      email: user.email,
      contact: null,
      address: null,
      badge: null,
      emailVerified: user.emailVerified,
      registeredAt: serverTimestamp(),
      ...(userType !== "volunteer" && { totalDonations: 0 }), // Only for donors
    };

    await setDoc(userRef, userData);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setVerifying(true);

    try {
      if (!userType) {
        setError("Please select Donor or Volunteer");
        setVerifying(false);
        return;
      }

      if (!email || !password || !name) {
        setError("Please fill in all required fields");
        setVerifying(false);
        return;
      }

      // Display verification message
      setSuccessMsg("Account created! Please verify your email to continue.");

      // Create user account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Send verification email
      await sendEmailVerification(userCredential.user);

      // Update UI state - NOT saving to Firestore yet
      setVerificationSent(true);
      setVerifying(false);
      setResendDisabled(true);
      setCountdown(60);
    } catch (err) {
      console.error("Signup error:", err);
      setError(err.message);
      setVerifying(false);
    }
  };

  const handleVerificationSuccess = async (user) => {
    try {
      // Save user to Firestore only after email verification
      await saveUserToFirestore(user);

      // Update user context
      setUser({
        uid: user.uid,
        email: user.email,
        userType,
        emailVerified: true,
      });

      // Navigate to complete profile
      navigate("/complete-profile");
    } catch (err) {
      console.error("Verification update error:", err);
      setError(err.message);
    }
  };

  const handleManualVerificationCheck = async () => {
    try {
      if (!auth.currentUser) {
        setError("No user session found. Please try signing up again.");
        return;
      }

      // Reload the user to get fresh status
      await auth.currentUser.reload();

      if (auth.currentUser.emailVerified) {
        await handleVerificationSuccess(auth.currentUser);
      } else {
        setError(
          "Email not verified yet. Please check your inbox and click the verification link."
        );
      }
    } catch (err) {
      console.error("Verification check error:", err);
      setError(err.message);
    }
  };

  const handleResendVerification = async () => {
    try {
      if (!auth.currentUser) {
        setError("No user session found. Please try signing up again.");
        return;
      }

      await sendEmailVerification(auth.currentUser);
      setResendDisabled(true);
      setCountdown(60);
      setError("");
      setSuccessMsg("Verification email sent! Please check your inbox.");
    } catch (err) {
      console.error("Resend verification error:", err);
      setError(err.message);
    }
  };

  const handleCancelSignup = async () => {
    try {
      if (auth.currentUser) {
        // Delete the user account if they cancel during verification
        await auth.currentUser.delete();
        await signOut(auth);
      }

      // Reset form
      setVerificationSent(false);
      setEmail("");
      setPassword("");
      setName("");
      setError("");
      setSuccessMsg("");
    } catch (err) {
      console.error("Cancel signup error:", err);
      setError(err.message);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      if (!userType) {
        setError("Please select Donor or Volunteer");
        return;
      }

      const userCredential = await signInWithPopup(auth, googleProvider);

      // Google sign-in automatically verifies email
      await saveUserToFirestore(userCredential.user);

      setUser({
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        userType,
        emailVerified: true,
      });

      navigate("/complete-profile");
    } catch (err) {
      setError(err.message);
    }
  };

  if (verificationSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4 py-8">
        <div className="w-full max-w-md bg-gray-100 p-8 rounded-xl shadow-lg text-center">
          <HiOutlineInformationCircle className="mx-auto text-5xl text-blue-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Check Your Email
          </h1>
          <p className="text-gray-600 mb-6">
            We've sent a verification link to <strong>{email}</strong>. Please
            check your inbox and click the verification link to activate your
            account.
          </p>

          {error && (
            <p className="text-red-500 mb-4 text-sm md:text-base">{error}</p>
          )}

          {successMsg && (
            <p className="text-green-500 mb-4 text-sm md:text-base">
              {successMsg}
            </p>
          )}

          <div className="space-y-4">
            <button
              onClick={handleManualVerificationCheck}
              className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition"
            >
              I've Verified My Email
            </button>

            <button
              onClick={handleResendVerification}
              disabled={resendDisabled}
              className={`w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition ${
                resendDisabled ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {resendDisabled
                ? `Resend in ${countdown}s`
                : "Resend Verification Email"}
            </button>

            <button
              onClick={handleCancelSignup}
              className="w-full bg-white border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-100 transition"
            >
              Cancel & Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row items-center justify-center bg-white px-4 py-8">
      {/* Welcome Section */}
      <div className="w-full md:w-1/2 p-4 md:p-10 mb-6 md:mb-0">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
          {userType === "volunteer"
            ? "Be the Change! 🤝"
            : userType === "donor"
            ? "Join Us in Making a Difference! 🌍"
            : "Choose How You Want to Help! 🌟"}
        </h2>
        <p className="text-md md:text-lg text-gray-600">
          {userType === "volunteer"
            ? "Sign up as a volunteer and help distribute food to those who need it the most."
            : userType === "donor"
            ? "Sign up to donate food and help those in need. Your generosity can change lives!"
            : "Select your role to get started on your journey of making a positive impact."}
        </p>

        <div className="flex gap-4 mt-6">
          <button
            className={`px-4 md:px-6 py-2 rounded-lg transition ${
              userType === "volunteer"
                ? "bg-blue-500 text-white"
                : "bg-gray-200"
            }`}
            onClick={() => setUserType("volunteer")}
          >
            Volunteer
          </button>
          <button
            className={`px-4 md:px-6 py-2 rounded-lg transition ${
              userType === "donor" ? "bg-blue-500 text-white" : "bg-gray-200"
            }`}
            onClick={() => setUserType("donor")}
          >
            Donor
          </button>
        </div>
      </div>

      {/* Sign Up Form Section */}
      <div className="w-full md:w-1/2 bg-gray-100 p-6 md:p-10 rounded-xl shadow-lg">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
          Sign Up
        </h1>

        {error && (
          <p className="text-red-500 mb-4 text-sm md:text-base">{error}</p>
        )}

        {successMsg && (
          <p className="text-green-500 mb-4 text-sm md:text-base">
            {successMsg}
          </p>
        )}

        <form className="space-y-4" onSubmit={handleSignup}>
          <div className="relative">
            <HiOutlineUser className="absolute left-3 top-3 text-gray-500" />
            <input
              type="text"
              placeholder="Full Name"
              className="w-full px-10 py-2 border rounded-lg text-sm md:text-base"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="relative">
            <HiOutlineMail className="absolute left-3 top-3 text-gray-500" />
            <input
              type="email"
              placeholder="Email"
              className="w-full px-10 py-2 border rounded-lg text-sm md:text-base"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="relative">
            <HiOutlineLockClosed className="absolute left-3 top-3 text-gray-500" />
            <input
              type="password"
              placeholder="Password"
              className="w-full px-10 py-2 border rounded-lg text-sm md:text-base"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="text-sm text-gray-600 mt-2">
            By signing up, you'll need to verify your email address before
            accessing your account.
          </div>
          <button
            type="submit"
            disabled={verifying}
            className={`w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition text-sm md:text-base ${
              verifying ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {verifying ? "Creating Account..." : "Sign Up"}
          </button>
        </form>

        {/* <div className="flex items-center my-4">
          <div className="flex-1 border-b border-gray-300"></div>
          <span className="px-3 text-gray-500 text-sm md:text-base">OR</span>
          <div className="flex-1 border-b border-gray-300"></div>
        </div> */}

        {/* <button
          onClick={handleGoogleSignup}
          className="w-full flex items-center justify-center gap-2 bg-white border py-2 rounded-lg shadow hover:bg-gray-100 transition text-sm md:text-base"
        >
          <FcGoogle className="text-xl md:text-2xl" />
          Sign Up with Google
        </button> */}

        <p className="mt-4 text-gray-600 text-sm md:text-base">
          Already have an account?{" "}
          <button
            className="text-blue-500 hover:underline"
            onClick={() => navigate("/auth/login")}
          >
            Login
          </button>
        </p>
      </div>
    </div>
  );
};

export default Signup;
