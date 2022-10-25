import React, { useEffect, useState } from "react";
import NavLink from "./components/Navlink";
import ProjectCard2 from "./components/ProjectCard2";
import Model from "./components/model";
import { items } from "./components/data";
import Modal, {
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "./components/modal/Modal";
import { IoClose } from "react-icons/io5";
import NavLink2 from "./components/Navlink2";

function Projects(props) {
  const [toggler, setToggler] = useState(false);
  const [render, setRender] = useState(false);

  const [selectedItem, setSelectedItem] = useState({
    title: "dsf",
    description: "dsf",
    repo: "sdf",
    tech: ["cxw"],
  });

  function openModal(el) {
    setSelectedItem({
      title: el.title,
      description: el.description,
      repo: el.repo,
      tech: el.tech,
    });
    setShowModal(true);
  }

  useEffect(() => {
    setRender(true);
  },[]);

  const [showModal, setShowModal] = useState(false);

  if (!render) {
    return null;
  } else {
    return (
      <>
        <div >
          <Modal
            show={showModal}
            setShowModal={setShowModal}
            item={selectedItem}
          />

          <section className="w-full flex justify-center md:mt-40 sm:mt-28 mt-24">
            <div className="w-[80%] flex flex-col items-center sm:ml-14">
              <h1 className="sm:text-7xl text-5xl font-bold mt-10">My Projects</h1>
              <h2 className="text-gray-400 py-8 text-lg w-[80%] sm:w-full text-center">
                Here are a few projects I&apos;ve worked on recently in my two fields
              </h2>
              <div className="flex mb-16 gap-10 mt-10 sm:text-2xl text-lg font-bold relative overflow-hidden w-full justify-center ">
                <NavLink2
                  text="Data Science & AI"
                  active={toggler ? false : true}
                  Toggler={() => setToggler(false)}
                />
                <div className="w-[2px] bg-portfolio-light "></div>
                <NavLink2
                  text="Web development"
                  active={toggler ? true : false}
                  Toggler={() => setToggler(true)}
                />
              </div>
            </div>
          </section>

          <section className="w-full flex justify-center">
            <div className="w-[80%] gap-5 sm:ml-14 flex justify-center">
              <div className="grid md:grid-cols-3 sm:grid-cols-2 grid-cols  w-[80%] sm:w-full gap-x-5 gap-y-16 mb-16">
                {items.filter(el => toggler === false ? el.type === "Data Science" : el.type === "Web Dev").map((el) =>

                (
                  <ProjectCard2
                    key={el.id}
                    title={el.title}
                    type={el.type}
                    description={el.description}
                    repo={el.repo}
                    image={el.image}
                    tech={el.tech}
                    funct={() => {
                      openModal(el);
                    }}
                  />
                ))}
              </div>
            </div>
          </section>
        </div>
      </>
    );
  }
}

export default Projects;
