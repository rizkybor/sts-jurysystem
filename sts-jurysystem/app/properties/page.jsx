// import properties from "@/properties.json";
import PropertyCard from "@/components/PropertyCard";
import connectDB from "@/config/database";
import Property from "@/models/Property";

const Properties = async ({searchParams: {page=1, pageSize = 3}}) => {
  connectDB()
  const properties = await Property.find({}).lean();
  return (
    <section className="px-4 py-6">
      <div className="container-xl lg:container m-auto px-4 py-6">
        {properties.length === 0 ? (
          <p>No Properties Found</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {properties.map((property) => (
                <PropertyCard key={property.id} property={property}></PropertyCard>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Properties;