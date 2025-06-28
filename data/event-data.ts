import type {
  EventComponents,
  EventSuppliers,
  EventBundle,
} from "@/types/event-types";

// Add new supplier categories to eventSuppliers
export const eventSuppliers: EventSuppliers = {
  wedding: {
    catering: ["Elegant Feasts", "Royal Banquets", "Gourmet Delights"],
    photography: [
      "DreamShots",
      "Timeless Photography",
      "Golden Memories Studio",
    ],
    venue: ["Grand Ballroom", "Garden Paradise", "Beachfront Villa"],
    entertainment: [
      "Wedding DJ Services",
      "Live Band Collective",
      "String Quartet",
    ],
    decoration: [
      "Elegant Designs",
      "Floral Fantasies",
      "Wedding Decor Specialists",
    ],
    transportation: ["Luxury Limos", "Classic Cars", "Wedding Shuttles"],
    equipment: [
      "Sound Systems Pro",
      "Lighting Solutions",
      "Event Tech Rentals",
    ],
  },
  birthday: {
    catering: ["Fun Party Foods", "Kids Delight Catering"],
    photography: ["Happy Snaps", "Colorful Memories"],
    venue: ["Party Hall", "Backyard Setup", "Restaurant"],
    entertainment: ["Party DJs", "Clown Services", "Magic Shows"],
    decoration: ["Balloon Masters", "Theme Decorators", "Party Supplies"],
    transportation: ["Party Bus", "Group Transport", "VIP Services"],
    equipment: ["Sound Rentals", "Game Equipment", "Party Tech"],
  },
  corporate: {
    catering: ["Executive Caterers", "Fine Dining Services"],
    photography: ["Pro Media Shoots", "Corporate Coverage"],
    venue: ["Conference Room", "Hotel Function Hall", "Office Space"],
    entertainment: [
      "Corporate Entertainers",
      "Keynote Speakers",
      "Team Building Facilitators",
    ],
    decoration: [
      "Corporate Event Design",
      "Brand Experience",
      "Professional Staging",
    ],
    transportation: [
      "Executive Transport",
      "Group Shuttles",
      "Airport Services",
    ],
    equipment: ["Presentation Equipment", "Conference Tech", "AV Solutions"],
  },
};

// Add descriptions for new categories
export const componentDescriptions = {
  catering: {
    "Buffet Style":
      "Food is presented on a table for guests to serve themselves. Offers variety and flexibility.",
    "Fine Dining":
      "Formal, full-service dining experience with multiple courses served by waitstaff.",
    "Custom Menu":
      "Personalized menu options tailored to your specific preferences and dietary needs.",
    "Kids Buffet":
      "Child-friendly food options presented in an accessible format for younger guests.",
    "Candy Bar":
      "Assortment of candies and sweets displayed for guests to enjoy throughout the event.",
    "Themed Cake":
      "Custom-designed cake that matches your event theme and specifications.",
    "Business Lunch":
      "Professional catering options suitable for corporate meetings and events.",
    "Cocktail Bar":
      "Beverage service featuring a selection of alcoholic and non-alcoholic drinks.",
    "Gourmet Meals":
      "High-quality, expertly prepared dishes using premium ingredients.",
  },
  photography: {
    "Prenup Shoot":
      "Photo session before the wedding to capture romantic moments between the couple.",
    "Full Event Coverage":
      "Comprehensive photography service covering all aspects of your event.",
    "Photo Booth":
      "Interactive photo station where guests can take fun pictures with props.",
    "Birthday Shoot":
      "Professional photography focused on the birthday celebrant and special moments.",
    "Instant Prints":
      "On-site printing of photos for guests to take home as souvenirs.",
    "Custom Backgrounds":
      "Specialized backdrops tailored to your event theme for photo sessions.",
    "Speaker Coverage":
      "Photography focused on presenters and speakers at corporate events.",
    "Panel Recording": "Documentation of panel discussions and Q&A sessions.",
    "Networking Event Photos":
      "Candid and posed shots of attendees interacting at business events.",
  },
  venue: {
    Decorations:
      "Aesthetic elements that enhance the appearance of your event space.",
    "Seating Arrangement":
      "Strategic placement of tables and chairs to optimize space and flow.",
    Lighting:
      "Illumination design to create the desired atmosphere and highlight key areas.",
    "Balloon Setup":
      "Balloon arrangements and displays to add a festive touch to your event.",
    "Themed Decor":
      "Decorative elements that align with your chosen event theme.",
    "Stage Setup":
      "Platform and backdrop arrangement for presentations or performances.",
    "Audiovisual Equipment":
      "Technical gear for sound, visuals, and presentations.",
    Seating:
      "Chairs and tables arranged according to your event's layout requirements.",
  },

  entertainment: {
    "DJ Services":
      "Professional DJ providing music and entertainment throughout your event.",
    "Live Band": "Live musical performance by professional musicians.",
    "MC Services":
      "Professional master of ceremonies to guide your event program.",
    Performers:
      "Specialized entertainers like dancers, magicians, or other performers.",
    "Children's Entertainment":
      "Entertainment options specifically designed for younger guests.",
    "Interactive Activities":
      "Engaging activities for guests to participate in during the event.",
    "Keynote Speaker":
      "Professional speaker to deliver a presentation or speech.",
    "Team Building":
      "Organized activities designed to improve team cohesion and collaboration.",
  },

  decoration: {
    "Floral Arrangements":
      "Fresh flower displays and decorations for your event.",
    "Theme Decorations":
      "Decorative elements aligned with your chosen event theme.",
    "Furniture Rental": "Stylish furniture pieces to enhance your event space.",
    Signage: "Custom signs and directional markers for your event.",
    Centerpieces: "Decorative focal points for tables and key areas.",
    "Backdrop Design": "Custom backdrop for photo opportunities or key areas.",
    "Branding Elements":
      "Custom decorations featuring company logos and branding.",
    "Exhibition Booths":
      "Professional display areas for products or information.",
  },

  transportation: {
    "Guest Shuttle":
      "Transportation service for moving guests between locations.",
    "VIP Transport": "Premium transportation for key individuals.",
    "Parking Services": "Managed parking solutions for event attendees.",
    "Airport Transfers":
      "Transportation to and from airports for out-of-town guests.",
    "Luxury Vehicles": "High-end vehicles for special transportation needs.",
    "Group Transport": "Large-capacity vehicles for moving groups efficiently.",
    "Executive Cars": "Professional car service for business executives.",
    "Accessible Transport":
      "Transportation options for guests with mobility needs.",
  },

  equipment: {
    "Sound System": "Audio equipment for music and announcements.",
    "Lighting Equipment":
      "Specialized lighting to create the desired atmosphere.",
    "Video Equipment":
      "Screens, projectors, and other visual display technology.",
    "Stage Setup":
      "Platform and structural elements for presentations or performances.",
    "Furniture Rental":
      "Tables, chairs, and other furniture items for your event.",
    "Power Solutions":
      "Generators and power distribution for outdoor or large events.",
    "Technical Support":
      "On-site technicians to manage equipment during your event.",
    "Conference Equipment":
      "Specialized gear for business meetings and conferences.",
  },
};

// Add subcomponent descriptions for new categories
export const subComponentDescriptions = {
  // Catering - Buffet Style
  Catering_Appetizers:
    "Small, bite-sized food items served before the main course. Options range from simple to gourmet.",
  Catering_MainCourse:
    "Primary dish options that form the centerpiece of the meal.",
  Catering_Desserts:
    "Sweet treats served after the main course, including cakes, pastries, and other confections.",

  // Catering - Fine Dining
  Catering_CourseMenu:
    "Structured meal progression with multiple courses served in sequence.",
  Catering_WinePairing:
    "Complementary wines selected to enhance the flavors of each course.",
  Catering_TableService:
    "Professional waitstaff providing attentive service throughout the meal.",

  // Catering - Custom Menu
  Catering_DietaryOptions:
    "Specialized menu items catering to specific dietary restrictions or preferences.",
  Catering_ThemedFood:
    "Dishes designed to match your event theme or cultural preferences.",

  // Catering - Kids Buffet
  Catering_MainItems:
    "Kid-friendly main dishes that appeal to younger palates.",
  Catering_Sides: "Complementary food items that accompany the main dishes.",
  Catering_Drinks:
    "Beverages suitable for children, including juices and soft drinks.",

  // Catering - Candy Bar
  Catering_CandyTypes:
    "Various sweets and confections displayed for guests to enjoy.",
  Catering_Display:
    "Aesthetic arrangement of candies in decorative containers and stands.",

  // Catering - Themed Cake
  Catering_CakeSize:
    "Dimensions of the cake, determining how many guests it can serve.",
  Catering_CakeFlavor:
    "Taste profile of the cake, including options for different layers.",
  Catering_CakeDesign:
    "Visual appearance of the cake, including decorations and toppers.",

  // Catering - Business Lunch
  Catering_LunchStyle:
    "Format of food service, such as boxed lunches or buffet-style.",
  Catering_MenuType: "Quality and variety level of the food offerings.",
  Catering_LunchDietaryOptions:
    "Accommodations for various dietary needs and preferences.",

  // Catering - Cocktail Bar
  Catering_BarType:
    "Range of beverages offered, from limited to comprehensive selections.",
  Catering_Bartenders: "Number of professional servers managing the bar.",
  Catering_SpecialtyDrinks:
    "Custom cocktails created specifically for your event.",

  // Catering - Gourmet Meals
  Catering_Courses: "Number of sequential dishes served during the meal.",
  Catering_ServiceStyle:
    "Method of food delivery, such as plated or family-style.",
  Catering_MenuLevel: "Quality tier of ingredients and preparation techniques.",

  // Photography - Prenup Shoot
  Photo_Location: "Setting where the photography session takes place.",
  Photo_PrenupHours: "Duration of the photography service.",

  // Photography - Full Event Coverage
  Photo_Photographers:
    "Number of professional photographers capturing your event.",
  Photo_EventVideo:
    "Optional video recording services to complement still photography.",
  Photo_Drone:
    "Aerial photography using remote-controlled aircraft for unique perspectives.",

  // Photography - Photo Booth
  Photo_BoothType: "Style and capabilities of the photo station setup.",
  Photo_Props: "Fun accessories for guests to use in their photos.",
  Photo_BoothHours:
    "Duration the photo booth will be available during your event.",

  // Photography - Birthday Shoot
  Photo_ShootDuration:
    "Length of time the photographer will be capturing the event.",
  Photo_ShootStyle:
    "Approach to photography, such as formal portraits or candid moments.",

  // Photography - Instant Prints
  Photo_PrintSize: "Dimensions of the physical photographs provided to guests.",
  Photo_Frames: "Optional decorative borders for the printed photos.",

  // Photography - Custom Backgrounds
  Photo_BackgroundTheme: "Visual style of the backdrop used for photos.",
  Photo_BackgroundSize: "Dimensions of the background setup.",

  // Photography - Speaker Coverage
  Photo_Angles: "Variety of perspectives used to capture presentations.",
  Photo_SpeakerVideo: "Optional recording of speeches and presentations.",

  // Photography - Panel Recording
  Photo_Audio: "Sound capture quality for discussions and Q&A sessions.",
  Photo_PanelVideo: "Visual recording of panel participants and interactions.",
  Photo_Editing: "Post-production refinement of the recorded content.",

  // Photography - Networking Event Photos
  Photo_NetworkingStyle: "Approach to capturing interactions among attendees.",
  Photo_NetworkingCoverage: "Extent of the event documented in photographs.",
  Photo_Delivery: "Method of providing the final images to the client.",

  // Venue - Decorations
  Venue_DecorTheme: "Overall aesthetic direction for the decorative elements.",
  Venue_Flowers: "Floral arrangements and displays throughout the venue.",
  Venue_DecorBackdrop:
    "Feature installation behind key areas like head tables or stages.",

  // Venue - Seating Arrangement
  Venue_Tables: "Style and layout of tables for guests.",
  Venue_Chairs: "Type of seating provided for attendees.",
  Venue_Linens: "Table cloths, napkins, and other fabric elements.",

  // Venue - Lighting
  Venue_Ambient: "General illumination setting the overall mood.",
  Venue_Spotlights: "Focused lighting highlighting specific areas or features.",
  Venue_SpecialEffects:
    "Dynamic or unusual lighting elements for visual impact.",

  // Venue - Balloon Setup
  Venue_BalloonType: "Material and style of balloons used in decorations.",
  Venue_Arrangement: "Configuration of balloon displays throughout the venue.",

  // Venue - Themed Decor
  Venue_ThemeStyle: "Stylistic direction for decorative elements.",
  Venue_ThemeCoverage: "Extent of themed decorations throughout the venue.",
  Venue_ThemeProps: "Decorative objects enhancing the themed atmosphere.",

  // Venue - Lighting (Birthday)
  Venue_LightingType: "Style of lighting fixtures and effects used.",
  Venue_LightingEffects: "Dynamic lighting elements adding visual interest.",

  // Venue - Stage Setup
  Venue_StageSize:
    "Dimensions of the platform for presentations or performances.",
  Venue_StageBackdrop: "Visual element behind the stage area.",
  Venue_Podium: "Speaking stand for presenters, with optional branding.",

  // Venue - Audiovisual Equipment
  Venue_Projector: "Device for displaying visual content on a screen.",
  Venue_SoundSystem: "Audio equipment for music and speeches.",
  Venue_Microphones: "Voice amplification devices for speakers and performers.",

  // Venue - Seating
  Venue_SeatingLayout: "Arrangement pattern of chairs and tables in the space.",
  Venue_SeatingChairs: "Style and quality of seating provided for guests.",
  Venue_SeatingTables: "Surfaces for dining, displays, or activities.",

  // Entertainment - DJ Services
  Entertainment_EquipmentLevel:
    "Quality and extent of sound and lighting equipment provided by the DJ.",
  Entertainment_DJHours: "Duration of the DJ service during your event.",
  Entertainment_MusicSelection:
    "Range and customization of music playlist for your event.",

  // Entertainment - Live Band
  Entertainment_BandSize: "Number of musicians in the performing group.",
  Entertainment_PerformanceDuration:
    "Length of time the band will perform during your event.",
  Entertainment_Genre: "Style of music performed by the band.",

  // Entertainment - MC Services
  Entertainment_MCExperience:
    "Professional background and expertise of the master of ceremonies.",
  Entertainment_LanguageOptions:
    "Languages the MC can comfortably speak during your event.",
  Entertainment_MCCustomization:
    "Degree to which the MC's script and approach can be tailored to your event.",

  // Entertainment - Performers
  Entertainment_PerformerType:
    "Category of performance or entertainment provided.",
  Entertainment_PerformerDuration:
    "Length of time the performers will entertain at your event.",
  Entertainment_PerformerCount: "How many entertainers will be present.",

  // Entertainment - Children's Entertainment
  Entertainment_ActivityType:
    "Nature of the entertainment provided for children.",
  Entertainment_AgeRange: "Target age group for the entertainment options.",
  Entertainment_ChildrenDuration:
    "How long the children's entertainment will last.",

  // Entertainment - Interactive Activities
  Entertainment_InteractiveType:
    "Nature of the interactive experience offered to guests.",
  Entertainment_InteractiveEquipment:
    "Materials and gear needed for the interactive activities.",
  Entertainment_Facilitators:
    "Number of staff members guiding the interactive experience.",

  // Entertainment - Keynote Speaker
  Entertainment_SpeakerLevel: "Experience and reputation level of the speaker.",
  Entertainment_Topic: "Subject matter of the presentation.",
  Entertainment_SpeakerDuration: "Length of the speaking engagement.",

  // Entertainment - Team Building
  Entertainment_TeamActivityType: "Nature of the team building exercises.",
  Entertainment_TeamGroupSize:
    "Number of participants the activities can accommodate.",
  Entertainment_TeamDuration: "Length of the team building program.",

  // Decoration - Floral Arrangements
  Decor_ArrangementType: "Style and format of the flower displays.",
  Decor_FlowerSelection: "Types of flowers used in the arrangements.",
  Decor_FlowerQuantity: "Number of floral arrangements provided.",

  // Decoration - Theme Decorations
  Decor_ThemeStyle: "Visual aesthetic of the decorative elements.",
  Decor_ThemeCoverage: "Extent of the venue covered by themed decorations.",
  Decor_ThemeElements: "Specific decorative items included in the package.",

  // Decoration - Furniture Rental
  Decor_FurnitureType: "Categories of furniture pieces provided.",
  Decor_FurnitureStyle: "Aesthetic design of the furniture items.",
  Decor_FurnitureQuantity: "Number of furniture pieces included.",

  // Decoration - Signage
  Decor_SignType: "Format and purpose of the signs provided.",
  Decor_SignMaterial: "Physical composition of the signage.",
  Decor_SignCustomization: "Degree to which signs can be personalized.",

  // Decoration - Centerpieces
  Decor_CenterpieceStyle: "Design aesthetic of the table centerpieces.",
  Decor_CenterpieceSize: "Dimensions of the centerpiece arrangements.",
  Decor_CenterpieceQuantity: "Number of centerpieces provided.",

  // Decoration - Backdrop Design
  Decor_BackdropStyle: "Visual design of the backdrop.",
  Decor_BackdropSize: "Dimensions of the backdrop installation.",
  Decor_BackdropFeatures:
    "Special elements incorporated into the backdrop design.",

  // Decoration - Branding Elements
  Decor_BrandingType: "Format of the branded decorative items.",
  Decor_BrandingPlacement:
    "Where branded elements will be positioned in the venue.",
  Decor_BrandingQuantity: "Number of branded items included.",

  // Decoration - Exhibition Booths
  Decor_BoothType: "Style and format of the exhibition spaces.",
  Decor_BoothFeatures: "Special elements included in the booth setup.",
  Decor_BoothSize: "Dimensions of the exhibition area.",

  // Transportation - Guest Shuttle
  Transport_ShuttleType: "Kind of transportation vehicle provided.",
  Transport_ShuttleCapacity:
    "Number of passengers each vehicle can accommodate.",
  Transport_ShuttleHours: "Duration of the shuttle service availability.",

  // Transportation - VIP Transport
  Transport_VIPType: "Style of vehicle used for VIP transportation.",
  Transport_VIPHours: "Duration of the VIP transport service.",
  Transport_VIPAmenities:
    "Special features or services included in the VIP transport.",

  // Transportation - Parking Services
  Transport_ParkingType: "Nature of the parking management provided.",
  Transport_ParkingCapacity:
    "Number of vehicles the parking service can accommodate.",
  Transport_ParkingStaff: "Number of personnel managing the parking service.",

  // Transportation - Airport Transfers
  Transport_AirportType: "Kind of transportation used for airport transfers.",
  Transport_AirportService: "Quality tier of the transfer service.",
  Transport_AirportFlexibility:
    "Ability to accommodate schedule changes or delays.",

  // Transportation - Luxury Vehicles
  Transport_LuxuryType: "Specific model or category of luxury vehicle.",
  Transport_LuxuryHours: "Duration of the luxury vehicle service.",
  Transport_Chauffeur: "Type of driver service included.",

  // Transportation - Group Transport
  Transport_GroupType: "Kind of transportation used for group movement.",
  Transport_GroupCapacity: "Number of passengers each vehicle can accommodate.",
  Transport_Routes: "Predetermined paths for the transportation service.",

  // Transportation - Executive Cars
  Transport_ExecutiveClass: "Category of executive vehicle provided.",
  Transport_ExecutiveService: "Quality tier of the executive car service.",
  Transport_ExecutiveHours: "Duration of the executive car availability.",

  // Transportation - Accessible Transport
  Transport_AccessibleType: "Kind of accessible transportation provided.",
  Transport_AccessibleFeatures:
    "Special accommodations for passengers with mobility needs.",
  Transport_AccessibleCapacity:
    "Number of passengers and wheelchairs each vehicle can accommodate.",

  // Equipment - Sound System
  Equipment_SoundSize: "Scale and power of the audio equipment.",
  Equipment_SoundComponents: "Specific audio devices included in the setup.",
  Equipment_SoundTechnician:
    "Level of technical support provided with the sound system.",

  // Equipment - Lighting Equipment
  Equipment_LightingType: "Categories of lighting fixtures provided.",
  Equipment_LightingCoverage: "Area illuminated by the lighting setup.",
  Equipment_LightingEffects:
    "Dynamic lighting elements included in the package.",

  // Equipment - Video Equipment
  Equipment_ScreenSize: "Dimensions of display surfaces.",
  Equipment_Resolution: "Image quality of the video equipment.",
  Equipment_VideoSetup: "Configuration of the video display system.",

  // Equipment - Stage Setup
  Equipment_StageSize: "Dimensions of the platform area.",
  Equipment_StageFeatures:
    "Special elements included in the stage construction.",
  Equipment_StageDesign: "Visual aesthetic of the stage area.",

  // Equipment - Furniture Rental
  Equipment_FurnitureType: "Categories of furniture pieces provided.",
  Equipment_FurnitureQuantity: "Number of furniture items included.",
  Equipment_FurnitureStyle: "Design aesthetic of the furniture pieces.",

  // Equipment - Power Solutions
  Equipment_GeneratorSize: "Power output capacity of electrical equipment.",
  Equipment_PowerDistribution: "How power is delivered throughout the venue.",
  Equipment_BackupSystems: "Redundancy measures for power reliability.",

  // Equipment - Technical Support
  Equipment_StaffLevel: "Expertise of the technical personnel.",
  Equipment_TeamSize: "Number of technicians provided.",
  Equipment_SupportHours: "Duration of technical support availability.",

  // Equipment - Conference Equipment
  Equipment_ConferenceType: "Categories of conference technology provided.",
  Equipment_ConferenceFeatures:
    "Special capabilities of the conference equipment.",
  Equipment_ConferenceSetup:
    "Configuration of the conference technology system.",
};

// Add new components for the additional categories
export const eventComponents: EventComponents = {
  wedding: {
    catering: [
      {
        name: "Buffet Style",
        description: componentDescriptions.catering["Buffet Style"],
        subComponents: [
          {
            name: "Appetizers",
            options: ["Standard", "Premium", "Deluxe"],
            quantifiable: true,
            description: subComponentDescriptions["Catering_Appetizers"],
          },
          {
            name: "Main Course",
            options: ["Standard", "Premium", "Deluxe"],
            quantifiable: true,
            description: subComponentDescriptions["Catering_MainCourse"],
          },
          {
            name: "Desserts",
            options: ["Standard", "Premium", "Deluxe"],
            quantifiable: true,
            description: subComponentDescriptions["Catering_Desserts"],
          },
        ],
      },
      {
        name: "Fine Dining",
        description: componentDescriptions.catering["Fine Dining"],
        subComponents: [
          {
            name: "Course Menu",
            options: ["3-Course", "5-Course", "7-Course"],
            quantifiable: false,
            description: subComponentDescriptions["Catering_CourseMenu"],
          },
          {
            name: "Wine Pairing",
            options: ["None", "Standard", "Premium"],
            quantifiable: false,
            description: subComponentDescriptions["Catering_WinePairing"],
          },
          {
            name: "Table Service",
            options: ["Standard", "Premium"],
            quantifiable: false,
            description: subComponentDescriptions["Catering_TableService"],
          },
        ],
      },
      {
        name: "Custom Menu",
        description: componentDescriptions.catering["Custom Menu"],
        subComponents: [
          {
            name: "Dietary Options",
            options: ["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free"],
            quantifiable: true,
            description: subComponentDescriptions["Catering_DietaryOptions"],
          },
          {
            name: "Themed Food",
            options: ["Cultural", "Seasonal", "Fusion"],
            quantifiable: false,
            description: subComponentDescriptions["Catering_ThemedFood"],
          },
        ],
      },
    ],
    photography: [
      {
        name: "Prenup Shoot",
        description: componentDescriptions.photography["Prenup Shoot"],
        subComponents: [
          {
            name: "Location",
            options: ["Studio", "Outdoor", "Destination"],
            quantifiable: false,
            description: subComponentDescriptions["Photo_Location"],
          },
          {
            name: "Hours",
            options: ["2 Hours", "4 Hours", "Full Day"],
            quantifiable: false,
            description: subComponentDescriptions["Photo_PrenupHours"],
          },
        ],
      },
      {
        name: "Full Event Coverage",
        description: componentDescriptions.photography["Full Event Coverage"],
        subComponents: [
          {
            name: "Photographers",
            options: ["1 Photographer", "2 Photographers", "3 Photographers"],
            quantifiable: false,
            description: subComponentDescriptions["Photo_Photographers"],
          },
          {
            name: "Video",
            options: ["None", "Standard", "Cinematic"],
            quantifiable: false,
            description: subComponentDescriptions["Photo_EventVideo"],
          },
          {
            name: "Drone",
            options: ["None", "Basic", "Extended"],
            quantifiable: false,
            description: subComponentDescriptions["Photo_Drone"],
          },
        ],
      },
      {
        name: "Photo Booth",
        description: componentDescriptions.photography["Photo Booth"],
        subComponents: [
          {
            name: "Booth Type",
            options: ["Standard", "360 Booth", "GIF Booth"],
            quantifiable: false,
            description: subComponentDescriptions["Photo_BoothType"],
          },
          {
            name: "Props",
            options: ["Basic", "Themed", "Custom"],
            quantifiable: false,
            description: subComponentDescriptions["Photo_Props"],
          },
          {
            name: "Hours",
            options: ["2 Hours", "4 Hours", "Full Event"],
            quantifiable: false,
            description: subComponentDescriptions["Photo_BoothHours"],
          },
        ],
      },
    ],
    venue: [
      {
        name: "Decorations",
        description: componentDescriptions.venue["Decorations"],
        subComponents: [
          {
            name: "Theme",
            options: ["Classic", "Modern", "Rustic", "Bohemian"],
            quantifiable: false,
            description: subComponentDescriptions["Venue_DecorTheme"],
          },
          {
            name: "Flowers",
            options: ["Minimal", "Standard", "Elaborate"],
            quantifiable: false,
            description: subComponentDescriptions["Venue_Flowers"],
          },
          {
            name: "Backdrop",
            options: ["None", "Standard", "Custom"],
            quantifiable: false,
            description: subComponentDescriptions["Venue_DecorBackdrop"],
          },
        ],
      },
      {
        name: "Seating Arrangement",
        description: componentDescriptions.venue["Seating Arrangement"],
        subComponents: [
          {
            name: "Tables",
            options: ["Round", "Rectangle", "Mixed"],
            quantifiable: true,
            description: subComponentDescriptions["Venue_Tables"],
          },
          {
            name: "Chairs",
            options: ["Folding", "Chiavari", "Ghost", "Throne"],
            quantifiable: true,
            description: subComponentDescriptions["Venue_Chairs"],
          },
          {
            name: "Linens",
            options: ["Basic", "Premium", "Luxury"],
            quantifiable: true,
            description: subComponentDescriptions["Venue_Linens"],
          },
        ],
      },
      {
        name: "Lighting",
        description: componentDescriptions.venue["Lighting"],
        subComponents: [
          {
            name: "Ambient",
            options: ["Basic", "Mood", "Dynamic"],
            quantifiable: false,
            description: subComponentDescriptions["Venue_Ambient"],
          },
          {
            name: "Spotlights",
            options: ["None", "Basic", "Advanced"],
            quantifiable: true,
            description: subComponentDescriptions["Venue_Spotlights"],
          },
          {
            name: "Special Effects",
            options: ["None", "Gobo", "Projection Mapping"],
            quantifiable: false,
            description: subComponentDescriptions["Venue_SpecialEffects"],
          },
        ],
      },
    ],

    entertainment: [
      {
        name: "DJ Services",
        description: componentDescriptions.entertainment["DJ Services"],
        subComponents: [
          {
            name: "Equipment Level",
            options: ["Basic", "Standard", "Premium"],
            quantifiable: false,
            description:
              subComponentDescriptions["Entertainment_EquipmentLevel"],
          },
          {
            name: "Hours",
            options: ["4 Hours", "6 Hours", "8 Hours", "Full Day"],
            quantifiable: false,
            description: subComponentDescriptions["Entertainment_DJHours"],
          },
          {
            name: "Music Selection",
            options: ["Standard", "Customized", "Fully Curated"],
            quantifiable: false,
            description:
              subComponentDescriptions["Entertainment_MusicSelection"],
          },
        ],
      },
      {
        name: "Live Band",
        description: componentDescriptions.entertainment["Live Band"],
        subComponents: [
          {
            name: "Band Size",
            options: ["Trio", "Quartet", "Full Band"],
            quantifiable: false,
            description: subComponentDescriptions["Entertainment_BandSize"],
          },
          {
            name: "Performance Duration",
            options: ["2 Hours", "3 Hours", "4 Hours"],
            quantifiable: false,
            description:
              subComponentDescriptions["Entertainment_PerformanceDuration"],
          },
          {
            name: "Genre",
            options: ["Classical", "Jazz", "Pop/Rock", "Variety"],
            quantifiable: false,
            description: subComponentDescriptions["Entertainment_Genre"],
          },
        ],
      },
      {
        name: "MC Services",
        description: componentDescriptions.entertainment["MC Services"],
        subComponents: [
          {
            name: "Experience Level",
            options: ["Standard", "Professional", "Celebrity"],
            quantifiable: false,
            description: subComponentDescriptions["Entertainment_MCExperience"],
          },
          {
            name: "Language Options",
            options: ["English", "Bilingual", "Multilingual"],
            quantifiable: false,
            description:
              subComponentDescriptions["Entertainment_LanguageOptions"],
          },
          {
            name: "Customization",
            options: ["Basic", "Tailored", "Fully Custom"],
            quantifiable: false,
            description:
              subComponentDescriptions["Entertainment_MCCustomization"],
          },
        ],
      },
    ],

    decoration: [
      {
        name: "Floral Arrangements",
        description: componentDescriptions.decoration["Floral Arrangements"],
        subComponents: [
          {
            name: "Arrangement Type",
            options: ["Centerpieces", "Bouquets", "Installations", "Mixed"],
            quantifiable: false,
            description: subComponentDescriptions["Decor_ArrangementType"],
          },
          {
            name: "Flower Selection",
            options: ["Seasonal", "Premium", "Exotic", "Custom"],
            quantifiable: false,
            description: subComponentDescriptions["Decor_FlowerSelection"],
          },
          {
            name: "Quantity",
            options: ["Minimal", "Standard", "Abundant"],
            quantifiable: true,
            description: subComponentDescriptions["Decor_FlowerQuantity"],
          },
        ],
      },
      {
        name: "Theme Decorations",
        description: componentDescriptions.decoration["Theme Decorations"],
        subComponents: [
          {
            name: "Theme Style",
            options: ["Classic", "Modern", "Rustic", "Bohemian", "Custom"],
            quantifiable: false,
            description: subComponentDescriptions["Decor_ThemeStyle"],
          },
          {
            name: "Coverage Area",
            options: ["Entrance Only", "Key Areas", "Full Venue"],
            quantifiable: false,
            description: subComponentDescriptions["Decor_ThemeCoverage"],
          },
          {
            name: "Elements",
            options: ["Basic", "Standard", "Elaborate"],
            quantifiable: false,
            description: subComponentDescriptions["Decor_ThemeElements"],
          },
        ],
      },
      {
        name: "Backdrop Design",
        description: componentDescriptions.decoration["Backdrop Design"],
        subComponents: [
          {
            name: "Style",
            options: ["Floral", "Geometric", "Custom Design", "Minimalist"],
            quantifiable: false,
            description: subComponentDescriptions["Decor_BackdropStyle"],
          },
          {
            name: "Size",
            options: ["Small", "Medium", "Large"],
            quantifiable: false,
            description: subComponentDescriptions["Decor_BackdropSize"],
          },
          {
            name: "Features",
            options: ["Basic", "Illuminated", "Interactive"],
            quantifiable: false,
            description: subComponentDescriptions["Decor_BackdropFeatures"],
          },
        ],
      },
    ],

    transportation: [
      {
        name: "Guest Shuttle",
        description: componentDescriptions.transportation["Guest Shuttle"],
        subComponents: [
          {
            name: "Vehicle Type",
            options: ["Van", "Minibus", "Coach"],
            quantifiable: true,
            description: subComponentDescriptions["Transport_ShuttleType"],
          },
          {
            name: "Capacity",
            options: ["Up to 15", "16-30", "31-50"],
            quantifiable: false,
            description: subComponentDescriptions["Transport_ShuttleCapacity"],
          },
          {
            name: "Hours",
            options: ["4 Hours", "6 Hours", "8 Hours", "Custom"],
            quantifiable: false,
            description: subComponentDescriptions["Transport_ShuttleHours"],
          },
        ],
      },
      {
        name: "VIP Transport",
        description: componentDescriptions.transportation["VIP Transport"],
        subComponents: [
          {
            name: "Vehicle Type",
            options: ["Luxury Sedan", "SUV", "Limousine"],
            quantifiable: true,
            description: subComponentDescriptions["Transport_VIPType"],
          },
          {
            name: "Hours",
            options: ["2 Hours", "4 Hours", "6 Hours", "Custom"],
            quantifiable: false,
            description: subComponentDescriptions["Transport_VIPHours"],
          },
          {
            name: "Amenities",
            options: ["Standard", "Premium", "Ultra-Luxury"],
            quantifiable: false,
            description: subComponentDescriptions["Transport_VIPAmenities"],
          },
        ],
      },
      {
        name: "Luxury Vehicles",
        description: componentDescriptions.transportation["Luxury Vehicles"],
        subComponents: [
          {
            name: "Vehicle Type",
            options: ["Classic Car", "Luxury Sedan", "Exotic Car"],
            quantifiable: false,
            description: subComponentDescriptions["Transport_LuxuryType"],
          },
          {
            name: "Hours",
            options: ["2 Hours", "4 Hours", "Full Day"],
            quantifiable: false,
            description: subComponentDescriptions["Transport_LuxuryHours"],
          },
          {
            name: "Chauffeur",
            options: ["Standard", "Professional", "VIP"],
            quantifiable: false,
            description: subComponentDescriptions["Transport_Chauffeur"],
          },
        ],
      },
    ],

    equipment: [
      {
        name: "Sound System",
        description: componentDescriptions.equipment["Sound System"],
        subComponents: [
          {
            name: "System Size",
            options: ["Small", "Medium", "Large"],
            quantifiable: false,
            description: subComponentDescriptions["Equipment_SoundSize"],
          },
          {
            name: "Components",
            options: ["Basic", "Standard", "Professional"],
            quantifiable: false,
            description: subComponentDescriptions["Equipment_SoundComponents"],
          },
          {
            name: "Technician",
            options: ["Setup Only", "On-Call", "Full-Time"],
            quantifiable: false,
            description: subComponentDescriptions["Equipment_SoundTechnician"],
          },
        ],
      },
      {
        name: "Lighting Equipment",
        description: componentDescriptions.equipment["Lighting Equipment"],
        subComponents: [
          {
            name: "Lighting Type",
            options: ["Ambient", "Accent", "Dynamic", "Full Package"],
            quantifiable: false,
            description: subComponentDescriptions["Equipment_LightingType"],
          },
          {
            name: "Coverage",
            options: ["Key Areas", "Dance Floor", "Full Venue"],
            quantifiable: false,
            description: subComponentDescriptions["Equipment_LightingCoverage"],
          },
          {
            name: "Special Effects",
            options: ["None", "Basic", "Premium"],
            quantifiable: false,
            description: subComponentDescriptions["Equipment_LightingEffects"],
          },
        ],
      },
      {
        name: "Video Equipment",
        description: componentDescriptions.equipment["Video Equipment"],
        subComponents: [
          {
            name: "Screen Size",
            options: ["Small", "Medium", "Large"],
            quantifiable: true,
            description: subComponentDescriptions["Equipment_ScreenSize"],
          },
          {
            name: "Resolution",
            options: ["Standard", "HD", "4K"],
            quantifiable: false,
            description: subComponentDescriptions["Equipment_Resolution"],
          },
          {
            name: "Setup",
            options: ["Basic", "Multi-Screen", "Immersive"],
            quantifiable: false,
            description: subComponentDescriptions["Equipment_VideoSetup"],
          },
        ],
      },
    ],
  },

  birthday: {
    catering: [
      {
        name: "Kids Buffet",
        description: componentDescriptions.catering["Kids Buffet"],
        subComponents: [
          {
            name: "Main Items",
            options: ["Pizza", "Burgers", "Pasta", "Sandwiches"],
            quantifiable: true,
            description: subComponentDescriptions["Catering_MainItems"],
          },
          {
            name: "Sides",
            options: ["Fries", "Fruit", "Vegetables"],
            quantifiable: true,
            description: subComponentDescriptions["Catering_Sides"],
          },
          {
            name: "Drinks",
            options: ["Juice", "Soda", "Water"],
            quantifiable: true,
            description: subComponentDescriptions["Catering_Drinks"],
          },
        ],
      },
      {
        name: "Candy Bar",
        description: componentDescriptions.catering["Candy Bar"],
        subComponents: [
          {
            name: "Candy Types",
            options: ["Chocolate", "Gummies", "Mixed"],
            quantifiable: true,
            description: subComponentDescriptions["Catering_CandyTypes"],
          },
          {
            name: "Display",
            options: ["Basic", "Themed", "Elaborate"],
            quantifiable: false,
            description: subComponentDescriptions["Catering_Display"],
          },
        ],
      },
      {
        name: "Themed Cake",
        description: componentDescriptions.catering["Themed Cake"],
        subComponents: [
          {
            name: "Size",
            options: ["Small", "Medium", "Large", "Tiered"],
            quantifiable: false,
            description: subComponentDescriptions["Catering_CakeSize"],
          },
          {
            name: "Flavor",
            options: ["Vanilla", "Chocolate", "Red Velvet", "Custom"],
            quantifiable: false,
            description: subComponentDescriptions["Catering_CakeFlavor"],
          },
          {
            name: "Design",
            options: ["Simple", "Character", "Custom"],
            quantifiable: false,
            description: subComponentDescriptions["Catering_CakeDesign"],
          },
        ],
      },
    ],
    photography: [
      {
        name: "Birthday Shoot",
        description: componentDescriptions.photography["Birthday Shoot"],
        subComponents: [
          {
            name: "Duration",
            options: ["1 Hour", "2 Hours", "3 Hours"],
            quantifiable: false,
            description: subComponentDescriptions["Photo_ShootDuration"],
          },
          {
            name: "Style",
            options: ["Candid", "Posed", "Mixed"],
            quantifiable: false,
            description: subComponentDescriptions["Photo_ShootStyle"],
          },
        ],
      },
      {
        name: "Instant Prints",
        description: componentDescriptions.photography["Instant Prints"],
        subComponents: [
          {
            name: "Print Size",
            options: ["Small", "Medium", "Large"],
            quantifiable: true,
            description: subComponentDescriptions["Photo_PrintSize"],
          },
          {
            name: "Frames",
            options: ["None", "Basic", "Themed"],
            quantifiable: true,
            description: subComponentDescriptions["Photo_Frames"],
          },
        ],
      },
      {
        name: "Custom Backgrounds",
        description: componentDescriptions.photography["Custom Backgrounds"],
        subComponents: [
          {
            name: "Theme",
            options: ["Character", "Color", "Custom"],
            quantifiable: false,
            description: subComponentDescriptions["Photo_BackgroundTheme"],
          },
          {
            name: "Size",
            options: ["Small", "Medium", "Large"],
            quantifiable: false,
            description: subComponentDescriptions["Photo_BackgroundSize"],
          },
        ],
      },
    ],
    venue: [
      {
        name: "Balloon Setup",
        description: componentDescriptions.venue["Balloon Setup"],
        subComponents: [
          {
            name: "Balloon Type",
            options: ["Regular", "Foil", "LED", "Mixed"],
            quantifiable: true,
            description: subComponentDescriptions["Venue_BalloonType"],
          },
          {
            name: "Arrangement",
            options: ["Arch", "Columns", "Ceiling", "Custom"],
            quantifiable: false,
            description: subComponentDescriptions["Venue_Arrangement"],
          },
        ],
      },
      {
        name: "Themed Decor",
        description: componentDescriptions.venue["Themed Decor"],
        subComponents: [
          {
            name: "Theme",
            options: ["Character", "Color", "Activity"],
            quantifiable: false,
            description: subComponentDescriptions["Venue_ThemeStyle"],
          },
          {
            name: "Coverage",
            options: ["Minimal", "Standard", "Full Venue"],
            quantifiable: false,
            description: subComponentDescriptions["Venue_ThemeCoverage"],
          },
          {
            name: "Props",
            options: ["None", "Basic", "Elaborate"],
            quantifiable: false,
            description: subComponentDescriptions["Venue_ThemeProps"],
          },
        ],
      },
      {
        name: "Lighting",
        description: componentDescriptions.venue["Lighting"],
        subComponents: [
          {
            name: "Type",
            options: ["Standard", "Colored", "Dynamic"],
            quantifiable: false,
            description: subComponentDescriptions["Venue_LightingType"],
          },
          {
            name: "Special Effects",
            options: ["None", "Disco", "Projections"],
            quantifiable: false,
            description: subComponentDescriptions["Venue_LightingEffects"],
          },
        ],
      },
    ],

    entertainment: [
      {
        name: "DJ Services",
        description: componentDescriptions.entertainment["DJ Services"],
        subComponents: [
          {
            name: "Equipment Level",
            options: ["Basic", "Standard", "Premium"],
            quantifiable: false,
            description:
              subComponentDescriptions["Entertainment_EquipmentLevel"],
          },
          {
            name: "Hours",
            options: ["2 Hours", "4 Hours", "6 Hours"],
            quantifiable: false,
            description: subComponentDescriptions["Entertainment_DJHours"],
          },
          {
            name: "Music Selection",
            options: ["Standard", "Customized", "Kid-Friendly"],
            quantifiable: false,
            description:
              subComponentDescriptions["Entertainment_MusicSelection"],
          },
        ],
      },
      {
        name: "Children's Entertainment",
        description:
          componentDescriptions.entertainment["Children's Entertainment"],
        subComponents: [
          {
            name: "Activity Type",
            options: ["Clown", "Magician", "Character Performer", "Games Host"],
            quantifiable: false,
            description: subComponentDescriptions["Entertainment_ActivityType"],
          },
          {
            name: "Age Range",
            options: ["Toddlers", "Kids (4-8)", "Tweens (9-12)", "Mixed Ages"],
            quantifiable: false,
            description: subComponentDescriptions["Entertainment_AgeRange"],
          },
          {
            name: "Duration",
            options: ["1 Hour", "2 Hours", "3 Hours"],
            quantifiable: false,
            description:
              subComponentDescriptions["Entertainment_ChildrenDuration"],
          },
        ],
      },
      {
        name: "Interactive Activities",
        description:
          componentDescriptions.entertainment["Interactive Activities"],
        subComponents: [
          {
            name: "Activity Type",
            options: ["Games", "Crafts", "Competitions", "Mixed"],
            quantifiable: false,
            description:
              subComponentDescriptions["Entertainment_InteractiveType"],
          },
          {
            name: "Equipment",
            options: ["Basic", "Standard", "Premium"],
            quantifiable: false,
            description:
              subComponentDescriptions["Entertainment_InteractiveEquipment"],
          },
          {
            name: "Facilitators",
            options: ["1", "2", "3+"],
            quantifiable: false,
            description: subComponentDescriptions["Entertainment_Facilitators"],
          },
        ],
      },
    ],

    decoration: [
      {
        name: "Theme Decorations",
        description: componentDescriptions.decoration["Theme Decorations"],
        subComponents: [
          {
            name: "Theme Style",
            options: ["Character", "Color Scheme", "Activity Theme", "Custom"],
            quantifiable: false,
            description: subComponentDescriptions["Decor_ThemeStyle"],
          },
          {
            name: "Coverage Area",
            options: ["Table Only", "Key Areas", "Full Venue"],
            quantifiable: false,
            description: subComponentDescriptions["Decor_ThemeCoverage"],
          },
          {
            name: "Elements",
            options: ["Basic", "Standard", "Elaborate"],
            quantifiable: false,
            description: subComponentDescriptions["Decor_ThemeElements"],
          },
        ],
      },
      {
        name: "Centerpieces",
        description: componentDescriptions.decoration["Centerpieces"],
        subComponents: [
          {
            name: "Style",
            options: ["Simple", "Themed", "Custom"],
            quantifiable: false,
            description: subComponentDescriptions["Decor_CenterpieceStyle"],
          },
          {
            name: "Size",
            options: ["Small", "Medium", "Large"],
            quantifiable: false,
            description: subComponentDescriptions["Decor_CenterpieceSize"],
          },
          {
            name: "Quantity",
            options: ["5", "10", "15", "20+"],
            quantifiable: true,
            description: subComponentDescriptions["Decor_CenterpieceQuantity"],
          },
        ],
      },
      {
        name: "Backdrop Design",
        description: componentDescriptions.decoration["Backdrop Design"],
        subComponents: [
          {
            name: "Style",
            options: ["Character", "Custom Design", "Photo Op"],
            quantifiable: false,
            description: subComponentDescriptions["Decor_BackdropStyle"],
          },
          {
            name: "Size",
            options: ["Small", "Medium", "Large"],
            quantifiable: false,
            description: subComponentDescriptions["Decor_BackdropSize"],
          },
          {
            name: "Features",
            options: ["Basic", "Interactive", "Illuminated"],
            quantifiable: false,
            description: subComponentDescriptions["Decor_BackdropFeatures"],
          },
        ],
      },
    ],

    transportation: [
      {
        name: "Party Bus",
        description: componentDescriptions.transportation["Group Transport"],
        subComponents: [
          {
            name: "Vehicle Type",
            options: ["Standard", "Luxury", "Themed"],
            quantifiable: false,
            description: subComponentDescriptions["Transport_GroupType"],
          },
          {
            name: "Capacity",
            options: ["Up to 15", "16-25", "26-40"],
            quantifiable: false,
            description: subComponentDescriptions["Transport_GroupCapacity"],
          },
          {
            name: "Hours",
            options: ["2 Hours", "3 Hours", "4 Hours"],
            quantifiable: false,
            description: subComponentDescriptions["Transport_Routes"],
          },
        ],
      },
      {
        name: "Group Transport",
        description: componentDescriptions.transportation["Group Transport"],
        subComponents: [
          {
            name: "Vehicle Type",
            options: ["Van", "Minibus", "Coach"],
            quantifiable: true,
            description: subComponentDescriptions["Transport_GroupType"],
          },
          {
            name: "Capacity",
            options: ["Up to 10", "11-20", "21-30"],
            quantifiable: false,
            description: subComponentDescriptions["Transport_GroupCapacity"],
          },
          {
            name: "Routes",
            options: ["One-way", "Round-trip", "Multiple Stops"],
            quantifiable: false,
            description: subComponentDescriptions["Transport_Routes"],
          },
        ],
      },
    ],

    equipment: [
      {
        name: "Sound System",
        description: componentDescriptions.equipment["Sound System"],
        subComponents: [
          {
            name: "System Size",
            options: ["Small", "Medium", "Large"],
            quantifiable: false,
            description: subComponentDescriptions["Equipment_SoundSize"],
          },
          {
            name: "Components",
            options: ["Basic", "Standard", "Professional"],
            quantifiable: false,
            description: subComponentDescriptions["Equipment_SoundComponents"],
          },
          {
            name: "Technician",
            options: ["Setup Only", "On-Call", "Full-Time"],
            quantifiable: false,
            description: subComponentDescriptions["Equipment_SoundTechnician"],
          },
        ],
      },
      {
        name: "Game Equipment",
        description:
          "Interactive games and activities equipment for entertainment.",
        subComponents: [
          {
            name: "Game Type",
            options: ["Video Games", "Carnival Games", "Inflatables", "Mixed"],
            quantifiable: false,
            description: "Category of games provided for entertainment.",
          },
          {
            name: "Quantity",
            options: ["1-3 Games", "4-6 Games", "7+ Games"],
            quantifiable: false,
            description: "Number of different games or activities included.",
          },
          {
            name: "Staff",
            options: ["None", "1 Attendant", "2+ Attendants"],
            quantifiable: false,
            description: "Personnel to manage and facilitate the games.",
          },
        ],
      },
    ],
  },

  corporate: {
    catering: [
      {
        name: "Business Lunch",
        description: componentDescriptions.catering["Business Lunch"],
        subComponents: [
          {
            name: "Style",
            options: ["Boxed", "Buffet", "Plated"],
            quantifiable: true,
            description: subComponentDescriptions["Catering_LunchStyle"],
          },
          {
            name: "Menu Type",
            options: ["Standard", "Premium", "Executive"],
            quantifiable: false,
            description: subComponentDescriptions["Catering_MenuType"],
          },
          {
            name: "Dietary Options",
            options: ["Standard", "Vegetarian", "Special Requests"],
            quantifiable: true,
            description:
              subComponentDescriptions["Catering_LunchDietaryOptions"],
          },
        ],
      },
      {
        name: "Cocktail Bar",
        description: componentDescriptions.catering["Cocktail Bar"],
        subComponents: [
          {
            name: "Bar Type",
            options: ["Beer & Wine", "Full Bar", "Premium Bar"],
            quantifiable: false,
            description: subComponentDescriptions["Catering_BarType"],
          },
          {
            name: "Bartenders",
            options: ["1", "2", "3+"],
            quantifiable: false,
            description: subComponentDescriptions["Catering_Bartenders"],
          },
          {
            name: "Specialty Drinks",
            options: ["None", "Signature Cocktail", "Multiple Options"],
            quantifiable: false,
            description: subComponentDescriptions["Catering_SpecialtyDrinks"],
          },
        ],
      },
      {
        name: "Gourmet Meals",
        description: componentDescriptions.catering["Gourmet Meals"],
        subComponents: [
          {
            name: "Courses",
            options: ["2-Course", "3-Course", "4-Course"],
            quantifiable: false,
            description: subComponentDescriptions["Catering_Courses"],
          },
          {
            name: "Service Style",
            options: ["Buffet", "Family Style", "Plated"],
            quantifiable: false,
            description: subComponentDescriptions["Catering_ServiceStyle"],
          },
          {
            name: "Menu Level",
            options: ["Standard", "Premium", "Executive"],
            quantifiable: false,
            description: subComponentDescriptions["Catering_MenuLevel"],
          },
        ],
      },
    ],
    photography: [
      {
        name: "Speaker Coverage",
        description: componentDescriptions.photography["Speaker Coverage"],
        subComponents: [
          {
            name: "Angles",
            options: ["Single", "Multiple", "Dynamic"],
            quantifiable: false,
            description: subComponentDescriptions["Photo_Angles"],
          },
          {
            name: "Video",
            options: ["None", "Standard", "Professional"],
            quantifiable: false,
            description: subComponentDescriptions["Photo_SpeakerVideo"],
          },
        ],
      },
      {
        name: "Panel Recording",
        description: componentDescriptions.photography["Panel Recording"],
        subComponents: [
          {
            name: "Audio",
            options: ["Basic", "Professional", "Multi-Channel"],
            quantifiable: false,
            description: subComponentDescriptions["Photo_Audio"],
          },
          {
            name: "Video",
            options: ["Single Camera", "Multi-Camera"],
            quantifiable: false,
            description: subComponentDescriptions["Photo_PanelVideo"],
          },
          {
            name: "Editing",
            options: ["None", "Basic", "Professional"],
            quantifiable: false,
            description: subComponentDescriptions["Photo_Editing"],
          },
        ],
      },
      {
        name: "Networking Event Photos",
        description:
          componentDescriptions.photography["Networking Event Photos"],
        subComponents: [
          {
            name: "Style",
            options: ["Candid", "Posed", "Mixed"],
            quantifiable: false,
            description: subComponentDescriptions["Photo_NetworkingStyle"],
          },
          {
            name: "Coverage",
            options: ["Partial", "Full Event"],
            quantifiable: false,
            description: subComponentDescriptions["Photo_NetworkingCoverage"],
          },
          {
            name: "Delivery",
            options: ["Digital", "Prints", "Both"],
            quantifiable: false,
            description: subComponentDescriptions["Photo_Delivery"],
          },
        ],
      },
    ],
    venue: [
      {
        name: "Stage Setup",
        description: componentDescriptions.venue["Stage Setup"],
        subComponents: [
          {
            name: "Size",
            options: ["Small", "Medium", "Large"],
            quantifiable: false,
            description: subComponentDescriptions["Venue_StageSize"],
          },
          {
            name: "Backdrop",
            options: ["Plain", "Branded", "Custom"],
            quantifiable: false,
            description: subComponentDescriptions["Venue_StageBackdrop"],
          },
          {
            name: "Podium",
            options: ["None", "Standard", "Branded"],
            quantifiable: false,
            description: subComponentDescriptions["Venue_Podium"],
          },
        ],
      },
      {
        name: "Audiovisual Equipment",
        description: componentDescriptions.venue["Audiovisual Equipment"],
        subComponents: [
          {
            name: "Projector",
            options: ["None", "Standard", "High-Definition"],
            quantifiable: true,
            description: subComponentDescriptions["Venue_Projector"],
          },
          {
            name: "Sound System",
            options: ["Basic", "Standard", "Premium"],
            quantifiable: false,
            description: subComponentDescriptions["Venue_SoundSystem"],
          },
          {
            name: "Microphones",
            options: ["Handheld", "Lapel", "Both"],
            quantifiable: true,
            description: subComponentDescriptions["Venue_Microphones"],
          },
        ],
      },
      {
        name: "Seating",
        description: componentDescriptions.venue["Seating"],
        subComponents: [
          {
            name: "Layout",
            options: ["Theater", "Classroom", "Boardroom", "U-Shape"],
            quantifiable: false,
            description: subComponentDescriptions["Venue_SeatingLayout"],
          },
          {
            name: "Chairs",
            options: ["Standard", "Executive", "Ergonomic"],
            quantifiable: true,
            description: subComponentDescriptions["Venue_SeatingChairs"],
          },
          {
            name: "Tables",
            options: ["None", "Standard", "Premium"],
            quantifiable: true,
            description: subComponentDescriptions["Venue_SeatingTables"],
          },
        ],
      },
    ],

    entertainment: [
      {
        name: "Keynote Speaker",
        description: componentDescriptions.entertainment["Keynote Speaker"],
        subComponents: [
          {
            name: "Speaker Level",
            options: ["Industry Expert", "Thought Leader", "Celebrity"],
            quantifiable: false,
            description: subComponentDescriptions["Entertainment_SpeakerLevel"],
          },
          {
            name: "Topic",
            options: [
              "Motivational",
              "Industry-Specific",
              "Leadership",
              "Custom",
            ],
            quantifiable: false,
            description: subComponentDescriptions["Entertainment_Topic"],
          },
          {
            name: "Duration",
            options: ["30 Minutes", "1 Hour", "90 Minutes"],
            quantifiable: false,
            description:
              subComponentDescriptions["Entertainment_SpeakerDuration"],
          },
        ],
      },
      {
        name: "Team Building",
        description: componentDescriptions.entertainment["Team Building"],
        subComponents: [
          {
            name: "Activity Type",
            options: ["Problem-Solving", "Creative", "Physical", "Mixed"],
            quantifiable: false,
            description:
              subComponentDescriptions["Entertainment_TeamActivityType"],
          },
          {
            name: "Group Size",
            options: ["Small (up to 20)", "Medium (21-50)", "Large (51+)"],
            quantifiable: false,
            description:
              subComponentDescriptions["Entertainment_TeamGroupSize"],
          },
          {
            name: "Duration",
            options: ["2 Hours", "Half Day", "Full Day"],
            quantifiable: false,
            description: subComponentDescriptions["Entertainment_TeamDuration"],
          },
        ],
      },
      {
        name: "MC Services",
        description: componentDescriptions.entertainment["MC Services"],
        subComponents: [
          {
            name: "Experience Level",
            options: ["Standard", "Professional", "Industry Specialist"],
            quantifiable: false,
            description: subComponentDescriptions["Entertainment_MCExperience"],
          },
          {
            name: "Language Options",
            options: ["English", "Bilingual", "Multilingual"],
            quantifiable: false,
            description:
              subComponentDescriptions["Entertainment_LanguageOptions"],
          },
          {
            name: "Customization",
            options: ["Basic", "Tailored", "Fully Custom"],
            quantifiable: false,
            description:
              subComponentDescriptions["Entertainment_MCCustomization"],
          },
        ],
      },
    ],

    decoration: [
      {
        name: "Branding Elements",
        description: componentDescriptions.decoration["Branding Elements"],
        subComponents: [
          {
            name: "Type",
            options: ["Banners", "Digital Displays", "3D Elements", "Mixed"],
            quantifiable: false,
            description: subComponentDescriptions["Decor_BrandingType"],
          },
          {
            name: "Placement",
            options: ["Entrance Only", "Key Areas", "Throughout Venue"],
            quantifiable: false,
            description: subComponentDescriptions["Decor_BrandingPlacement"],
          },
          {
            name: "Quantity",
            options: ["Minimal", "Standard", "Extensive"],
            quantifiable: true,
            description: subComponentDescriptions["Decor_BrandingQuantity"],
          },
        ],
      },
      {
        name: "Exhibition Booths",
        description: componentDescriptions.decoration["Exhibition Booths"],
        subComponents: [
          {
            name: "Booth Type",
            options: ["Standard", "Premium", "Custom"],
            quantifiable: true,
            description: subComponentDescriptions["Decor_BoothType"],
          },
          {
            name: "Features",
            options: ["Basic", "Interactive", "High-Tech"],
            quantifiable: false,
            description: subComponentDescriptions["Decor_BoothFeatures"],
          },
          {
            name: "Size",
            options: ["Small", "Medium", "Large"],
            quantifiable: false,
            description: subComponentDescriptions["Decor_BoothSize"],
          },
        ],
      },
      {
        name: "Signage",
        description: componentDescriptions.decoration["Signage"],
        subComponents: [
          {
            name: "Sign Type",
            options: ["Directional", "Informational", "Branding", "Mixed"],
            quantifiable: true,
            description: subComponentDescriptions["Decor_SignType"],
          },
          {
            name: "Material",
            options: ["Standard", "Premium", "Digital"],
            quantifiable: false,
            description: subComponentDescriptions["Decor_SignMaterial"],
          },
          {
            name: "Customization",
            options: ["Basic", "Branded", "Fully Custom"],
            quantifiable: false,
            description: subComponentDescriptions["Decor_SignCustomization"],
          },
        ],
      },
    ],

    transportation: [
      {
        name: "Executive Cars",
        description: componentDescriptions.transportation["Executive Cars"],
        subComponents: [
          {
            name: "Vehicle Class",
            options: ["Business", "Executive", "Luxury"],
            quantifiable: true,
            description: subComponentDescriptions["Transport_ExecutiveClass"],
          },
          {
            name: "Service Level",
            options: ["Standard", "Premium", "VIP"],
            quantifiable: false,
            description: subComponentDescriptions["Transport_ExecutiveService"],
          },
          {
            name: "Hours",
            options: ["4 Hours", "8 Hours", "Full Day"],
            quantifiable: false,
            description: subComponentDescriptions["Transport_ExecutiveHours"],
          },
        ],
      },
      {
        name: "Airport Transfers",
        description: componentDescriptions.transportation["Airport Transfers"],
        subComponents: [
          {
            name: "Vehicle Type",
            options: ["Sedan", "SUV", "Van"],
            quantifiable: true,
            description: subComponentDescriptions["Transport_AirportType"],
          },
          {
            name: "Service Level",
            options: ["Standard", "Premium", "VIP"],
            quantifiable: false,
            description: subComponentDescriptions["Transport_AirportService"],
          },
          {
            name: "Flexibility",
            options: ["Fixed Time", "Flexible Window", "On-Demand"],
            quantifiable: false,
            description:
              subComponentDescriptions["Transport_AirportFlexibility"],
          },
        ],
      },
      {
        name: "Group Transport",
        description: componentDescriptions.transportation["Group Transport"],
        subComponents: [
          {
            name: "Vehicle Type",
            options: ["Van", "Minibus", "Coach"],
            quantifiable: true,
            description: subComponentDescriptions["Transport_GroupType"],
          },
          {
            name: "Capacity",
            options: ["Up to 15", "16-30", "31-50"],
            quantifiable: false,
            description: subComponentDescriptions["Transport_GroupCapacity"],
          },
          {
            name: "Routes",
            options: ["One-way", "Round-trip", "Multiple Stops"],
            quantifiable: false,
            description: subComponentDescriptions["Transport_Routes"],
          },
        ],
      },
    ],

    equipment: [
      {
        name: "Conference Equipment",
        description: componentDescriptions.equipment["Conference Equipment"],
        subComponents: [
          {
            name: "Equipment Type",
            options: ["Basic AV", "Full Conference", "Interactive"],
            quantifiable: false,
            description: subComponentDescriptions["Equipment_ConferenceType"],
          },
          {
            name: "Features",
            options: ["Standard", "Advanced", "Cutting-Edge"],
            quantifiable: false,
            description:
              subComponentDescriptions["Equipment_ConferenceFeatures"],
          },
          {
            name: "Setup",
            options: ["Basic", "Professional", "Custom"],
            quantifiable: false,
            description: subComponentDescriptions["Equipment_ConferenceSetup"],
          },
        ],
      },
      {
        name: "Technical Support",
        description: componentDescriptions.equipment["Technical Support"],
        subComponents: [
          {
            name: "Staff Level",
            options: ["Basic", "Professional", "Specialist"],
            quantifiable: false,
            description: subComponentDescriptions["Equipment_StaffLevel"],
          },
          {
            name: "Team Size",
            options: ["1 Technician", "2-3 Technicians", "Full Team"],
            quantifiable: false,
            description: subComponentDescriptions["Equipment_TeamSize"],
          },
          {
            name: "Hours",
            options: ["Setup Only", "Key Hours", "Full Event"],
            quantifiable: false,
            description: subComponentDescriptions["Equipment_SupportHours"],
          },
        ],
      },
      {
        name: "Power Solutions",
        description: componentDescriptions.equipment["Power Solutions"],
        subComponents: [
          {
            name: "Generator Size",
            options: ["Small", "Medium", "Large"],
            quantifiable: false,
            description: subComponentDescriptions["Equipment_GeneratorSize"],
          },
          {
            name: "Distribution",
            options: ["Basic", "Standard", "Comprehensive"],
            quantifiable: false,
            description:
              subComponentDescriptions["Equipment_PowerDistribution"],
          },
          {
            name: "Backup Systems",
            options: ["None", "Basic", "Redundant"],
            quantifiable: false,
            description: subComponentDescriptions["Equipment_BackupSystems"],
          },
        ],
      },
    ],
  },
};

// Update the bundle prices to be more realistic in PHP (multiplying by approximately 50)
export const eventBundles: EventBundle[] = [
  {
    id: "wedding-essential",
    name: "Wedding Essentials",
    description:
      "A comprehensive package covering all the basic needs for a beautiful wedding celebration.",
    price: 250000,
    categories: {
      catering: {
        supplier: "Elegant Feasts",
        components: ["Buffet Style"],
      },
      photography: {
        supplier: "DreamShots",
        components: ["Full Event Coverage"],
      },
      venue: {
        supplier: "Garden Paradise",
        components: ["Decorations", "Seating Arrangement"],
      },
    },
    suitable: ["wedding"],
    popular: true,
  },
  {
    id: "wedding-premium",
    name: "Premium Wedding Experience",
    description:
      "Elevate your special day with our premium wedding package featuring top-tier services.",
    price: 475000,
    categories: {
      catering: {
        supplier: "Royal Banquets",
        components: ["Fine Dining", "Custom Menu"],
      },
      photography: {
        supplier: "Timeless Photography",
        components: ["Prenup Shoot", "Full Event Coverage", "Photo Booth"],
      },
      venue: {
        supplier: "Grand Ballroom",
        components: ["Decorations", "Seating Arrangement", "Lighting"],
      },
    },
    suitable: ["wedding"],
    popular: false,
  },
  {
    id: "birthday-fun",
    name: "Birthday Fun Pack",
    description:
      "Everything you need for a fun and memorable birthday celebration.",
    price: 60000,
    categories: {
      catering: {
        supplier: "Fun Party Foods",
        components: ["Kids Buffet", "Themed Cake"],
      },
      photography: {
        supplier: "Happy Snaps",
        components: ["Birthday Shoot", "Instant Prints"],
      },
      venue: {
        supplier: "Party Hall",
        components: ["Balloon Setup", "Themed Decor"],
      },
    },
    suitable: ["birthday"],
    popular: true,
  },
  {
    id: "corporate-standard",
    name: "Corporate Standard",
    description:
      "Professional event setup for business meetings and corporate gatherings.",
    price: 175000,
    categories: {
      catering: {
        supplier: "Executive Caterers",
        components: ["Business Lunch"],
      },
      photography: {
        supplier: "Pro Media Shoots",
        components: ["Speaker Coverage", "Networking Event Photos"],
      },
      venue: {
        supplier: "Conference Room",
        components: ["Stage Setup", "Audiovisual Equipment", "Seating"],
      },
    },
    suitable: ["corporate"],
    popular: true,
  },
  {
    id: "corporate-premium",
    name: "Executive Event Package",
    description:
      "Premium corporate event solution with high-end catering and comprehensive media coverage.",
    price: 375000,
    categories: {
      catering: {
        supplier: "Fine Dining Services",
        components: ["Gourmet Meals", "Cocktail Bar"],
      },
      photography: {
        supplier: "Corporate Coverage",
        components: [
          "Speaker Coverage",
          "Panel Recording",
          "Networking Event Photos",
        ],
      },
      venue: {
        supplier: "Hotel Function Hall",
        components: ["Stage Setup", "Audiovisual Equipment", "Seating"],
      },
    },
    suitable: ["corporate"],
    popular: false,
  },
  {
    id: "celebration-basic",
    name: "Basic Celebration",
    description:
      "A versatile package suitable for various celebration types with essential services.",
    price: 125000,
    categories: {
      catering: {
        supplier: "Gourmet Delights",
        components: ["Buffet Style"],
      },
      photography: {
        supplier: "Colorful Memories",
        components: ["Full Event Coverage"],
      },
      venue: {
        supplier: "Restaurant",
        components: ["Decorations"],
      },
    },
    suitable: ["wedding", "birthday", "corporate"],
    popular: true,
  },
];

// Add payment terms
export const paymentTerms = {
  title: "Event Booking Terms & Conditions",
  sections: [
    {
      title: "Payment Schedule",
      content: [
        "A 50% deposit is required to secure your booking date.",
        "The remaining balance is due 14 days prior to the event date.",
        "For bookings made less than 14 days before the event, full payment is required at the time of booking.",
        "All payments are non-refundable within 7 days of the event date.",
      ],
    },
    {
      title: "Cancellation Policy",
      content: [
        "Cancellations made 30+ days before the event: 75% of deposit refunded",
        "Cancellations made 14-29 days before the event: 50% of deposit refunded",
        "Cancellations made 7-13 days before the event: 25% of deposit refunded",
        "Cancellations made less than 7 days before the event: No refund",
      ],
    },
    {
      title: "Changes & Modifications",
      content: [
        "Minor changes to your booking can be made up to 7 days before the event at no additional cost.",
        "Major changes (date, venue, or significant component changes) may incur additional fees.",
        "All changes are subject to availability and must be confirmed in writing.",
      ],
    },
    {
      title: "On-Site Payments",
      content: [
        "On-site payments must be made in cash or by credit card.",
        "A valid ID and signature are required for all on-site payments.",
        "Additional services requested on-site will incur a 15% rush fee.",
        "All on-site payments must be documented with official receipts.",
      ],
    },
  ],
};
