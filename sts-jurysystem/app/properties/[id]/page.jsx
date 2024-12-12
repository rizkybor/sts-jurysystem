
const PropertyPage = ({params, searchParams}) => {

    return <div>
        <div>{searchParams.name}</div>
        Property Page { params.id }
    </div>;
}
 
export default PropertyPage;