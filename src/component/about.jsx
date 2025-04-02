import React from "react";
import foodWasteImage from "/foodwaste.jpg";
import hungryChildrenImage from "/hungryChildrenImage.jpg";

const About = () => {
  return (
    <section className="bg-cover bg-center py-16" style={{ backgroundImage: `url('/bg.jpg')` }}>
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-16 bg-white bg-opacity-90 rounded-lg p-8 shadow-lg">
          <h1 className="text-4xl md:text-5xl font-bold text-green-800 mb-4">About OneMealOneSmile</h1>
          <div className="w-24 h-1 bg-green-500 mx-auto mb-8"></div>
          <p className="text-lg text-gray-700 max-w-3xl mx-auto">
            Connecting food donors with those in need to reduce waste and fight hunger
          </p>
        </div>

        {/* Main content with image cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          {/* Mission card */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col h-full transform transition duration-300 hover:scale-105">
            <div className="h-64 overflow-hidden">
              <img 
                src={foodWasteImage}
                alt="Food waste that could be rescued" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-8">
              <h2 className="text-2xl font-semibold text-green-700 mb-4">Our Mission</h2>
              <p className="text-gray-700 mb-4">
                OneMealOneSmile is a platform dedicated to reducing food waste and hunger by connecting food donors with those in need. Our mission is to ensure that no one goes to bed hungry. We believe in the power of community and collaboration to make a significant impact.
              </p>
              <p className="text-gray-700">
                We facilitate the safe and efficient distribution of surplus food from restaurants, events, and individuals to shelters, soup kitchens, and other organizations that serve vulnerable populations.
              </p>
            </div>
          </div>

          {/* Vision card */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col h-full transform transition duration-300 hover:scale-105">
            <div className="h-64 overflow-hidden">
              <img 
                src={hungryChildrenImage}
                alt="Children receiving nutritious meals" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-8">
              <h2 className="text-2xl font-semibold text-green-700 mb-4">Our Impact</h2>
              <p className="text-gray-700 mb-4">
                Our platform provides tools for donors to easily list available food, and for volunteers to coordinate pickups and deliveries. We are committed to transparency and accountability, ensuring that all food donations reach those who need them most.
              </p>
              <p className="text-gray-700">
                Join us in our effort to create a world where everyone has access to nutritious food. Together, we can make a difference.
              </p>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="bg-green-700 text-white rounded-lg shadow-lg p-8 mb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">10,000+</div>
              <div className="text-xl">Meals Delivered</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">500+</div>
              <div className="text-xl">Partner Restaurants</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">50+</div>
              <div className="text-xl">Community Centers</div>
            </div>
          </div>
        </div>

        {/* Call to action */}
        <div className="text-center bg-white bg-opacity-90 rounded-lg p-8 shadow-lg">
          <h2 className="text-3xl font-bold text-green-800 mb-6">Ready to Make a Difference?</h2>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full transition duration-300">
              Donate Food
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full transition duration-300">
              Volunteer
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;